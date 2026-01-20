from datetime import datetime, timezone
from fastapi import APIRouter
from dto.response.feed import FeedResponse
from service import feed_service

router = APIRouter(prefix="/feed", tags=["feed"])


# Get all events
@router.get("", response_model=FeedResponse)
async def feed_route():
    generatedAt = datetime.now(timezone.utc).isoformat()
    dateET = datetime.now(timezone.utc).isoformat()

    traps, by_league = await feed_service.get_feed_events(dateET)

    return FeedResponse(
        generatedAt=generatedAt,
        dateET=dateET,
        traps=traps,
        by_league=by_league,
    )


