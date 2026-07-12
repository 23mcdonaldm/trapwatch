"""
Scheduled scores poller.

Cloud Scheduler hits POST /api/tasks/poll-scores every 30 minutes (same pattern
as the Google Sheets odds import). Each run:

  1. Liveness gate (0 API credits): per league, read today's + yesterday's events
     from Firestore and only continue if some non-completed game is inside its
     estimated live window (start .. start + duration + grace).
  2. Fetch GET /v4/sports/{sport}/scores?daysFrom=N (quota cost 2 per call).
  3. Match returned events to our sheet-based event docs (league + ET date +
     team nickname suffix). No match -> log and skip, never guess.
  4. Persist finalScore/status, then grade the game (user picks + system record).

Tune polling behavior with the constants below; Cloud Scheduler's cron controls
the actual cadence.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Header, HTTPException

from config.settings import settings
from enums.league import LeagueKey, OddsApiLeagueKey
from enums.event_status import EventStatus
from repository.get_events_repository import get_events, update_event_scores
from service import results_service

# ---- Tunables -------------------------------------------------------------
POLL_DAYS_FROM = 1          # /scores daysFrom param; returns completed games too (cost 2)
GAME_DURATION_HOURS = {
    LeagueKey.MLB.value: 3.5,
    LeagueKey.NFL.value: 3.5,
    LeagueKey.NCAAF.value: 3.5,
    LeagueKey.NBA.value: 2.5,
    LeagueKey.NCAAB.value: 2.5,
    LeagueKey.NHL.value: 3.0,
}
DEFAULT_GAME_DURATION_HOURS = 3.5
COMPLETION_GRACE_HOURS = 6  # keep polling past the estimate until stragglers report completed
# ---------------------------------------------------------------------------

ET_TZ = ZoneInfo("America/New_York")

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _now_et() -> datetime:
    return datetime.now(ET_TZ)


def _parse_game_time_et(gameTimeET: str) -> datetime | None:
    """Parse the sheet-style start time ("2026-07-11T12:05") as an ET datetime."""
    try:
        return datetime.fromisoformat(gameTimeET).replace(tzinfo=ET_TZ)
    except (ValueError, TypeError):
        return None


def _nickname(team: str) -> str:
    """
    Sheet team names are "{ABBR} {Nickname}" (e.g. "PIT Pirates", "BOS Red Sox").
    The nickname is everything after the first space; it's the stable suffix of
    the Odds API's full name ("Pittsburgh Pirates").
    """
    parts = team.split(" ", 1)
    return parts[1] if len(parts) == 2 else team


def _matches(api_name: str, sheet_team: str) -> bool:
    nickname = _nickname(sheet_team)
    return api_name == nickname or api_name.endswith(" " + nickname)


def _league_is_live(events: list[dict], now: datetime) -> bool:
    """Zero-credit gate: does any non-completed game sit inside its live window?"""
    for event in events:
        if event.get("status") == EventStatus.COMPLETED.value:
            continue
        start = _parse_game_time_et(event.get("gameTimeET", ""))
        if start is None:
            continue
        duration = GAME_DURATION_HOURS.get(event.get("league", ""), DEFAULT_GAME_DURATION_HOURS)
        window_end = start + timedelta(hours=duration + COMPLETION_GRACE_HOURS)
        if start <= now <= window_end:
            return True
    return False


async def _fetch_scores(odds_api_league: str) -> list[dict]:
    url = (
        f"{settings.odds_api_base_url}/sports/{odds_api_league}/scores"
        f"?apiKey={settings.odds_api_key}&daysFrom={POLL_DAYS_FROM}"
    )
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()


# Doubleheaders produce two same-day candidates with identical teams; the start
# time disambiguates. Must be well under the gap between games of a doubleheader.
MATCH_TIME_TOLERANCE_HOURS = 1.5


def _match_api_event(event: dict, api_events: list[dict]) -> dict | None:
    """
    Match a sheet event doc to an Odds API scores entry: same ET date + both
    team nicknames line up. Multiple candidates (doubleheaders) resolve to the
    one starting closest to our gameTimeET; still-ambiguous -> None.
    """
    event_date = (event.get("gameTimeET") or "")[:10]
    start = _parse_game_time_et(event.get("gameTimeET", ""))
    candidates = []
    for api_event in api_events:
        commence = api_event.get("commence_time")
        if not commence:
            continue
        commence_et = datetime.fromisoformat(commence.replace("Z", "+00:00")).astimezone(ET_TZ)
        if commence_et.strftime("%Y-%m-%d") != event_date:
            continue
        if _matches(api_event.get("home_team", ""), event.get("homeTeam", "")) and _matches(
            api_event.get("away_team", ""), event.get("awayTeam", "")
        ):
            candidates.append((api_event, commence_et))

    if len(candidates) == 1:
        return candidates[0][0]
    if len(candidates) > 1 and start is not None:
        best, best_commence = min(candidates, key=lambda c: abs(c[1] - start))
        if abs(best_commence - start) <= timedelta(hours=MATCH_TIME_TOLERANCE_HOURS):
            return best
    return None


def _extract_final_score(api_event: dict) -> dict | None:
    """Map the scores array [{name, score}] onto {home, away} by team name."""
    scores = api_event.get("scores") or []
    home_score = away_score = None
    for entry in scores:
        if entry.get("name") == api_event.get("home_team"):
            home_score = entry.get("score")
        elif entry.get("name") == api_event.get("away_team"):
            away_score = entry.get("score")
    if home_score is None or away_score is None:
        return None
    return {"home": int(home_score), "away": int(away_score)}


async def poll_league(league: LeagueKey, now: datetime) -> dict:
    """Poll one league if its liveness gate is open. Returns a run summary."""
    today = now.strftime("%Y-%m-%d")
    yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")

    events = []
    for date_str in (yesterday, today):
        for snap in get_events(date_str):
            data = snap.to_dict()
            if data.get("league") == league.value:
                data["id"] = data.get("id") or snap.id
                events.append(data)

    if not _league_is_live(events, now):
        return {"league": league.value, "polled": False, "completed": 0, "picks_graded": 0, "traps_recorded": 0}

    api_events = await _fetch_scores(OddsApiLeagueKey[league.name].value)

    completed = 0
    picks_graded = 0
    traps_recorded = 0
    for event in events:
        if event.get("status") == EventStatus.COMPLETED.value:
            continue
        api_event = _match_api_event(event, api_events)
        if api_event is None:
            print(f"poll-scores: no unambiguous match for {event.get('id')}")
            continue

        if api_event.get("completed"):
            final_score = _extract_final_score(api_event)
            if final_score is None:
                print(f"poll-scores: completed but no scores for {event.get('id')}")
                continue
            update_event_scores(
                event["id"],
                {
                    "finalScore": final_score,
                    "status": EventStatus.COMPLETED.value,
                    "scoresUpdatedAt": now.isoformat(),
                },
            )
            event["finalScore"] = final_score
            summary = results_service.evaluate_game(event["id"], event)
            completed += 1
            picks_graded += summary["picks_graded"]
            traps_recorded += summary["traps_recorded"]
        else:
            start = _parse_game_time_et(event.get("gameTimeET", ""))
            if start is not None and start <= now:
                fields = {"status": EventStatus.LIVE.value, "scoresUpdatedAt": now.isoformat()}
                # In-progress games carry a partial scores array — persist it so
                # cards can show the live score (freshness = poll cadence).
                live_score = _extract_final_score(api_event)
                if live_score is not None:
                    fields["liveScore"] = live_score
                update_event_scores(event["id"], fields)

    return {
        "league": league.value,
        "polled": True,
        "completed": completed,
        "picks_graded": picks_graded,
        "traps_recorded": traps_recorded,
    }


@router.post("/poll-scores")
async def poll_scores_route(x_scheduler_secret: str | None = Header(None)):
    """
    Scheduler-triggered scores poll across all leagues. Guarded by the
    SCHEDULER_SECRET setting (X-Scheduler-Secret header) when configured.
    """
    if settings.scheduler_secret and x_scheduler_secret != settings.scheduler_secret:
        raise HTTPException(status_code=401, detail="Invalid scheduler secret")

    now = _now_et()
    results = []
    for league in LeagueKey:
        if league == LeagueKey.ALL:
            continue
        try:
            results.append(await poll_league(league, now))
        except httpx.HTTPError as exc:
            results.append({"league": league.value, "polled": False, "error": str(exc)})

    return {"generatedAt": now.isoformat(), "leagues": results}
