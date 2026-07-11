from datetime import datetime, timezone
from fastapi import APIRouter
from dto.response.comments import CommentsResponse
from dto.request.comments import CommentsRequest
from service import comments_service

router = APIRouter(prefix="/comments", tags=["comments"])


# Calculate and update trap statuses for all events
@router.post("", response_model=CommentsResponse)
async def comments_route(payload: CommentsRequest):
    """
    User writes a comment for a game's market.
    
    Args in payload:
        game_id: The ID of the game
        user_id: The ID of the user
        display_name: The display name of the user
        market: The market of the vote
        comment: The comment

    Returns:
        CommentsResponse: The response containing the votes
    """
    generatedAt = datetime.now(timezone.utc).isoformat()
    

    comment = await comments_service.set_user_comment(payload.game_id, payload.user_id, payload.display_name, payload.market, payload.comment, generatedAt)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment couldn't be set")

    return CommentsResponse(
        generatedAt=generatedAt,
        comment=comment,
    )