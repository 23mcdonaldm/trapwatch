from datetime import datetime, timezone
from fastapi import APIRouter
from dto.response.traps import TrapsResponse
from service import traps_service

router = APIRouter(prefix="/traps", tags=["traps"])


# Calculate and update trap statuses for all events
@router.get("", response_model=TrapsResponse)
async def traps_route():
    """
    Recompute trap statuses for all events and persist changes.

    Status is set solely by detect_trap_status: public side must have
    odds >= -350 and bets% >= 65, then the bets-handle diff sets the tier
    (>= 25 TP, >= 35 TD, >= 50 TC, else NT). NT ("No Trap") is written
    explicitly so downgrades stick. Counts reflect markets whose Status
    changed to that tier this run.
    """
    generatedAt = datetime.now(timezone.utc).isoformat()

    TC_count, TD_count, TP_count, TC_games_ids, TD_games_ids, TP_games_ids = await traps_service.calculate_traps()
    total_processed = TC_count + TD_count + TP_count

    return TrapsResponse(
        generatedAt=generatedAt,
        TC_count=TC_count,
        TC_games_ids=TC_games_ids,
        TD_count=TD_count,
        TD_games_ids=TD_games_ids,
        TP_count=TP_count,
        TP_games_ids=TP_games_ids,
        total_processed=total_processed
    )


