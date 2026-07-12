from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from api.v1.deps import get_current_user
from dto.response.users import UserRecordResponse, UserPicksResponse
from service import users_service

router = APIRouter(prefix="/users", tags=["users"])


# Get the signed-in user's profile + running record
@router.get("/me/record", response_model=UserRecordResponse)
async def user_record_route(user: dict = Depends(get_current_user)):
    """
    The caller's profile and win/loss/push record. Identified by the verified
    Firebase ID token. Users with no activity yet get a zeroed record.
    """
    generatedAt = datetime.now(timezone.utc).isoformat()

    record = await users_service.get_record(user["uid"], user["name"])

    return UserRecordResponse(
        generatedAt=generatedAt,
        **record,
    )


# Get the signed-in user's pick history, newest first
@router.get("/me/picks", response_model=UserPicksResponse)
async def user_picks_route(
    user: dict = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = Query(None, description="generatedAt of the last pick from the previous page"),
):
    """
    A page of the caller's picks with results (pending | win | loss | push).
    Cursor pagination matches the comments endpoint.
    """
    generatedAt = datetime.now(timezone.utc).isoformat()

    picks, next_cursor = await users_service.get_picks(user["uid"], limit, cursor)

    return UserPicksResponse(
        generatedAt=generatedAt,
        picks=picks,
        nextCursor=next_cursor,
    )
