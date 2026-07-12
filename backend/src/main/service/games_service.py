from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from enums.league import LeagueKey
from repository import get_events_repository
from repository import social_repository

ET_TZ = ZoneInfo("America/New_York")


def _slim_summary(event_data: dict, league_key: str) -> dict:
    return {
        "id": event_data.get("id"),
        "league": league_key,
        "awayTeam": event_data.get("awayTeam"),
        "homeTeam": event_data.get("homeTeam"),
        "gameTimeET": event_data.get("gameTimeET"),
        "status": event_data.get("status"),
        "liveScore": event_data.get("liveScore"),
        "finalScore": event_data.get("finalScore"),
        "scoresUpdatedAt": event_data.get("scoresUpdatedAt"),
    }


async def get_games(dateET: str) -> tuple[dict[str, Any], int]:
    """
    Get ALL games for a given day grouped by league — not just flagged traps.

    Returns slim game summaries (no odds/market data) — the all-games list only
    needs enough to render a clickable row; full data comes from get_game(game_id).

    Returns: (by_league: {leagueKey: summary[]}, total)
    """
    by_league = {
        "americanfootballnfl": [],
        "americanfootballncaaf": [],
        "basketballnba": [],
        "basketballncaab": [],
        "baseballmlb": [],
        "icehockeynhl": [],
    }

    events = get_events_repository.get_events(dateET)

    total = 0
    for event in events:
        event_data = event.to_dict()
        league_key = event_data.get("league")
        allowed_leagues = {lk.value for lk in LeagueKey if lk != LeagueKey.ALL}
        if league_key not in allowed_leagues:
            continue
        by_league[league_key].append(_slim_summary(event_data, league_key))
        total += 1

    # Order each league's games by start time
    for league_key in by_league:
        by_league[league_key].sort(key=lambda e: e.get("gameTimeET", ""))

    return by_league, total


async def get_upcoming_games() -> tuple[str, list[dict], int]:
    """
    Every game from today (ET) forward — the look-ahead view — as slim
    summaries grouped day-first, then league. Bounded by DK's ~30-day horizon.

    Returns: (todayET, days: [{dateET, by_league, total}], total)
    """
    todayET = datetime.now(ET_TZ).strftime("%Y-%m-%d")
    allowed_leagues = {lk.value for lk in LeagueKey if lk != LeagueKey.ALL}

    by_date: dict[str, dict[str, list]] = {}
    total = 0
    for event in get_events_repository.get_upcoming_events(todayET):
        event_data = event.to_dict()
        league_key = event_data.get("league")
        if league_key not in allowed_leagues:
            continue
        date_key = (event_data.get("gameTimeET") or "")[:10]
        if not date_key:
            continue
        by_date.setdefault(date_key, {}).setdefault(league_key, []).append(
            _slim_summary(event_data, league_key)
        )
        total += 1

    days = []
    for date_key in sorted(by_date):
        day_leagues = by_date[date_key]
        day_total = 0
        for league_key in day_leagues:
            day_leagues[league_key].sort(key=lambda e: e.get("gameTimeET", ""))
            day_total += len(day_leagues[league_key])
        days.append({"dateET": date_key, "by_league": day_leagues, "total": day_total})

    return todayET, days, total


def _slim_history_side(side: dict | None) -> dict:
    side = side or {}
    return {
        "odds": side.get("odds"),
        "betsPct": side.get("betsPct"),
        "handlePct": side.get("handlePct"),
    }


async def get_game_history(game_id: str) -> dict[str, list[dict]] | None:
    """
    Odds-movement series for one game's three markets, oldest first, slimmed to
    what the movement charts need. Returns None if the game doesn't exist.
    """
    event = get_events_repository.get_event_by_id(game_id)
    if not event.exists:
        return None

    raw = get_events_repository.get_event_history(game_id)

    def point(doc: dict, side_keys: tuple[str, str], with_line: bool) -> dict:
        p: dict[str, Any] = {"t": doc.get("runTimestamp")}
        if with_line:
            p["line"] = doc.get("line")
        for key in side_keys:
            p[key] = _slim_history_side(doc.get(key))
        return p

    return {
        "moneyline": [point(d, ("home", "away"), False) for d in raw["moneyline"]],
        "spread": [point(d, ("home", "away"), True) for d in raw["spread"]],
        "total": [point(d, ("over", "under"), True) for d in raw["total"]],
    }


async def get_game(game_id: str) -> tuple[dict[str, Any], dict[str, Any]] | None:
    """
    Get a single game with its social aggregates (per market).
    Returns: (event, social) or None if the game doesn't exist.
    """
    event = get_events_repository.get_event_by_id(game_id)
    if not event.exists:
        return None

    social = social_repository.get_social_aggregates_for_game(game_id)
    return event.to_dict(), social
