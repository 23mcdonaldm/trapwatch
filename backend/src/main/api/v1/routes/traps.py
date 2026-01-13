from datetime import datetime, timezone
from fastapi import APIRouter
from dto.response.traps import TrapsResponse
from service import traps_service

router = APIRouter(prefix="/traps", tags=["traps"])


# Calculate and update trap statuses for all events
@router.get("", response_model=TrapsResponse)
async def traps_route():
    """
    Calculate traps for all events by reading from Firestore,
    computing the difference, and updating status fields.
    
    Status assignment:
    - TC (Trap City): difference > 30
    - TD (Trap Detected): difference > 20  
    - TP (Trap Potential): difference > 10
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


