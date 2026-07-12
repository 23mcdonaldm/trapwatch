from datetime import datetime, timezone
from fastapi import APIRouter, Query
from dto.response.records import SystemRecordsResponse, LeaderboardResponse
from service import records_service, users_service

router = APIRouter(tags=["records"])


# System (Trap City) record per tier
@router.get("/records/system", response_model=SystemRecordsResponse)
async def system_records_route():
    """
    The system's graded record keyed by trap tier (TC, TD, TP, overall).
    A tier's wins count flagged markets where the public side LOST.
    """
    generatedAt = datetime.now(timezone.utc).isoformat()

    records = await records_service.get_records()

    return SystemRecordsResponse(
        generatedAt=generatedAt,
        records=records,
    )


# Top users by wins
@router.get("/leaderboard", response_model=LeaderboardResponse)
async def leaderboard_route(limit: int = Query(25, ge=1, le=100)):
    """
    Users ordered by record.wins (desc). Public — displayName + record only
    plus the userId needed for stable keys.
    """
    generatedAt = datetime.now(timezone.utc).isoformat()

    leaderboard = await users_service.get_leaderboard(limit)

    return LeaderboardResponse(
        generatedAt=generatedAt,
        leaderboard=leaderboard,
    )
