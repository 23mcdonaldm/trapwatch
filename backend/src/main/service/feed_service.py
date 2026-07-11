from typing import Any

from enums.league import LeagueKey
from enums.trap_status import TrapStatus
from enums.event_status import Market
from repository import get_events_repository
from repository import social_repository

async def get_feed_events(dateET: str) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    Get events for all leagues for given day by traps, leagues
    Returns: (traps: {market, side, event}[], by_league: event[])
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


    events = get_events_repository.get_events(dateET)

    social_aggregates = social_repository.get_social_aggregates(dateET)
    social_aggregates_dict = {sa.id: sa.to_dict() for sa in social_aggregates}
    print(social_aggregates)
    print(social_aggregates_dict)
    

    for event in events:
        event_data = event.to_dict()
        league_key = event_data.get("league")
        allowed_leagues = {lk.value for lk in LeagueKey if lk != LeagueKey.ALL}
        if league_key not in allowed_leagues:
            continue
        by_league[league_key].append(event_data)
        current_odds = event_data.get("currentOdds", {})
        for market in Market:
            if market not in current_odds:
                continue
            opportunity_id = f"{event_data.get('id')}_{market.lower()}"
            social_aggregate = social_aggregates_dict.get(opportunity_id)
            print(social_aggregate)
            print(opportunity_id)
            if social_aggregate is None:
                social_counts = {"home": 0, "away": 0, "over": 0, "under": 0}
                social_comments_count = 0
                social_latest_comment = None
            else:
                social_counts = social_aggregate.get("counts", {})
                social_comments_count = social_aggregate.get("commentCount", 0)
                social_latest_comment = social_aggregate.get("latestComment", None)
            social = {
                "counts": social_counts,
                "commentCount": social_comments_count,
                "latestComment": social_latest_comment,
            }
            if current_odds[market].get("Status") == TrapStatus.TRAP_CITY.value:
                # TODO: Add StatusSide
                traps["TC"].append({"market": market, "side": current_odds[market].get("StatusSide"), "event": event_data, "social": social})
            elif current_odds[market].get("Status") == TrapStatus.TRAP_DETECTED.value:
                traps["TD"].append({"market": market, "side": current_odds[market].get("StatusSide"), "event": event_data, "social": social})
            elif current_odds[market].get("Status") == TrapStatus.TRAP_POTENTIAL.value:
                traps["TP"].append({"market": market, "side": current_odds[market].get("StatusSide"), "event": event_data, "social": social})

    return traps, by_league