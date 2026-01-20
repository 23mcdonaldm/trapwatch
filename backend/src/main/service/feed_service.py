from typing import Any

from enums.league import LeagueKey
from enums.trap_status import TrapStatus
from repository import get_events_repository

async def get_feed_events(dateET: str) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    Get events for all leagues for given day by traps, leagues
    Returns: (traps, by_league)
    """
    traps = {
        "TC": [],
        "TD": [],
        "TP": [],
    }
    by_league = {
        "americanfootballnfl": [],
        "americanfootballncaaf": [],
        "basketballnba": [],
        "basketballncaab": [],
        "baseballmlb": [],
        "icehockeynhl": [],
    }

    markets = ["Moneyline", "Spread", "Total"]

    events = get_events_repository.get_events(dateET)

    for event in events:
        event_data = event.to_dict()
        league_key = event_data.get("league")
        allowed_leagues = {lk.value for lk in LeagueKey if lk != LeagueKey.ALL}
        if league_key not in allowed_leagues:
            continue
        by_league[league_key].append(event_data)
        current_odds = event_data.get("currentOdds", {})
        for market in markets:
            if market not in current_odds:
                continue
            if current_odds[market].get("Status") == TrapStatus.TRAP_CITY.value:
                traps["TC"].append(event_data)
            elif current_odds[market].get("Status") == TrapStatus.TRAP_DETECTED.value:
                traps["TD"].append(event_data)
            elif current_odds[market].get("Status") == TrapStatus.TRAP_POTENTIAL.value:
                traps["TP"].append(event_data)

    return traps, by_league