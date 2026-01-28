from datetime import datetime, timezone
from fastapi import APIRouter
from dto.response.votes import VotesResponse
from dto.request.votes import VotesRequest
from service import votes_service

router = APIRouter(prefix="/votes", tags=["votes"])


# Calculate and update trap statuses for all events
@router.post("", response_model=VotesResponse)
async def votes_route(payload: VotesRequest):
    """
    User votes for a game's market.
    
    Args in payload:
        game_id: The ID of the game
        user_id: The ID of the user
        market: The market of the vote
        side: The side of the vote

    Returns:
        VotesResponse: The response containing the votes
    """
    generatedAt = datetime.now(timezone.utc).isoformat()
    print("HELLO")
    print(payload)
    

    vote = await votes_service.set_user_vote(payload.game_id, payload.user_id, payload.market, payload.side, generatedAt)
    if vote is None:
        raise HTTPException(status_code=404, detail="Vote couldn't be set")

    return VotesResponse(
        generatedAt=generatedAt,
    )