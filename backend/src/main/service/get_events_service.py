from datetime import datetime
import httpx

from config.settings import settings
from enums.league import LeagueKey
from repository import get_events_repository

async def get_all_events(dateET: str) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    Get events for all leagues for given day by traps, leagues
    Returns: (traps, by_league)
    """
    traps = {}
    by_league = {}

    events = await get_events_repository.get_events(dateET)

    return traps, by_league