from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from api.v1.deps import get_current_user_id
from dto.response.comments import CommentsResponse, CommentsListResponse
from dto.request.comments import CommentsRequest
from service import comments_service

router = APIRouter(prefix="/comments", tags=["comments"])


# User writes a comment for a game's market
@router.post("", response_model=CommentsResponse)
async def comments_route(payload: CommentsRequest, user_id: str = Depends(get_current_user_id)):
    """
    User writes a comment for a game's market.

    Args in payload:
        game_id: The ID of the game
        display_name: The display name of the user
        market: The market of the comment
        comment: The comment

    The user is identified by the verified Firebase ID token (Authorization header),
    never by a user_id in the body.

    Returns:
        CommentsResponse: The response containing the comment result
    """
    generatedAt = datetime.now(timezone.utc).isoformat()

    comment = await comments_service.set_user_comment(payload.game_id, user_id, payload.display_name, payload.market, payload.comment, generatedAt)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment couldn't be set")

    return CommentsResponse(
        generatedAt=generatedAt,
        comment=comment,
    )


# Get paginated comments for a game's market, newest first
@router.get("/{game_id}/{market}", response_model=CommentsListResponse)
async def comments_list_route(
    game_id: str,
    market: str,
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = Query(None, description="generatedAt of the last comment from the previous page"),
):
    """
    Get a page of comments for a game's market, newest first.

    Args:
        game_id: The ID of the game
        market: The market of the comments (Moneyline | Spread | Total)
        limit: Page size (default 20, max 50)
        cursor: Opaque pagination cursor from the previous page's nextCursor

    Returns:
        CommentsListResponse: The page of comments and the next cursor (null on last page)
    """
    generatedAt = datetime.now(timezone.utc).isoformat()

    result = await comments_service.get_comments(game_id, market, limit, cursor)
    if result is None:
        raise HTTPException(status_code=422, detail="Unknown market. Try one of: Moneyline, Spread, Total")
    comments, next_cursor = result

    return CommentsListResponse(
        generatedAt=generatedAt,
        comments=comments,
        nextCursor=next_cursor,
    )
