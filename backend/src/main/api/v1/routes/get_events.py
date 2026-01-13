from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi import HTTPException
from enums.league import LeagueKey
from dto.response.events import GetEventsResponse
from service import get_events_service

router = APIRouter(prefix="/get-events", tags=["get-events"])


# Get all events
@router.get("", response_model=GetEventsResponse)
async def get_all_events_route():
    generatedAt = datetime.now(timezone.utc).isoformat()
    dateET = datetime.now(timezone.utc).isoformat()

    traps, by_league = await get_events_service.get_all_events(dateET)

    return GetEventsResponse(
        generatedAt=generatedAt,
        dateET=dateET,
        traps=traps,
        by_league=by_league,
    )


