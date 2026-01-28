from datetime import datetime, timezone
from fastapi import APIRouter, Query
from typing import Optional
from dto.response.feed import FeedResponse
from service import feed_service

router = APIRouter(prefix="/feed", tags=["feed"])


# Get all events
@router.get("", response_model=FeedResponse)
async def feed_route(dateET: Optional[str] = Query(None, description="ISO date string for the date to fetch (defaults to today)")):
    generatedAt = datetime.now(timezone.utc).isoformat()
    
    # Use provided dateET or default to today
    if dateET:
        dateET_parsed = dateET
    else:
        dateET_parsed = datetime.now(timezone.utc).isoformat()

    traps, by_league = await feed_service.get_feed_events(dateET_parsed)

    return FeedResponse(
        generatedAt=generatedAt,
        dateET=dateET_parsed,
        traps=traps,
        by_league=by_league,
    )


