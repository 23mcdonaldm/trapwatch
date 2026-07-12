from repository.users_repository import get_user, get_leaderboard as repo_get_leaderboard
from repository.user_picks_repository import get_user_picks


async def get_record(user_id: str, token_name: str | None) -> dict:
    """
    A user's profile + running record. Users who haven't voted/commented yet
    get a zeroed record (no doc is created on read).
    """
    user = get_user(user_id)
    if user is None:
        return {
            "userId": user_id,
            "displayName": token_name or "Anonymous",
            "record": {"wins": 0, "losses": 0, "pushes": 0},
        }
    return {
        "userId": user_id,
        "displayName": user.get("displayName", "Anonymous"),
        "record": user.get("record", {"wins": 0, "losses": 0, "pushes": 0}),
    }


async def get_picks(user_id: str, limit: int, cursor: str | None) -> tuple[list[dict], str | None]:
    """A page of the user's pick history, newest first (see repository docs)."""
    return get_user_picks(user_id, limit, cursor)


async def get_leaderboard(limit: int) -> list[dict]:
    """Top users by wins."""
    return repo_get_leaderboard(limit)
