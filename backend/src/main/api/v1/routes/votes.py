from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from api.v1.deps import get_current_user_id
from dto.response.votes import VotesResponse
from dto.request.votes import VotesRequest
from service import votes_service

router = APIRouter(prefix="/votes", tags=["votes"])


# User votes on a game's market
@router.post("", response_model=VotesResponse)
async def votes_route(payload: VotesRequest, user_id: str = Depends(get_current_user_id)):
    """
    User votes for a game's market.

    Args in payload:
        game_id: The ID of the game
        market: The market of the vote
        side: The side of the vote

    The user is identified by the verified Firebase ID token (Authorization header),
    never by a user_id in the body.

    Returns:
        VotesResponse: The response containing the votes
    """
    generatedAt = datetime.now(timezone.utc).isoformat()

    vote = await votes_service.set_user_vote(payload.game_id, user_id, payload.market, payload.side, generatedAt)
    if vote is None:
        raise HTTPException(status_code=404, detail="Vote couldn't be set")

    return VotesResponse(
        generatedAt=generatedAt,
        vote=vote,
    )
