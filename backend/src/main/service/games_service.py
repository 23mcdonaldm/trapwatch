from typing import Any

from enums.league import LeagueKey
from repository import get_events_repository
from repository import social_repository


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
        by_league[league_key].append({
            "id": event_data.get("id"),
            "league": league_key,
            "awayTeam": event_data.get("awayTeam"),
            "homeTeam": event_data.get("homeTeam"),
            "gameTimeET": event_data.get("gameTimeET"),
            "status": event_data.get("status"),
        })
        total += 1

    # Order each league's games by start time
    for league_key in by_league:
        by_league[league_key].sort(key=lambda e: e.get("gameTimeET", ""))

    return by_league, total


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
