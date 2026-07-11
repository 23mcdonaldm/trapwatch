from datetime import datetime
import httpx

from config.settings import settings
from enums.league import LeagueKey
from repository.comments_repository import insert_user_comment, get_user_comments


async def set_user_comment(game_id: str, user_id: str, display_name: str, market: str, comment: str, generatedAt: str) -> bool:
    print(f"Setting user comment for game_id: {game_id}, user_id: {user_id}, display_name: {display_name}, market: {market}, comment: {comment}, generatedAt: {generatedAt}")
    # Lowercase BEFORE building opportunity_id so it matches the id the feed
    # reads aggregates from (feed_service uses f"{id}_{market.lower()}").
    market = market.lower()
    if market not in ["moneyline", "spread", "total"]:
        return None
    if not comment or not comment.strip():
        return None
    opportunity_id = f"{game_id}_{market}"

    inserted = insert_user_comment(opportunity_id, user_id, display_name, comment.strip(), generatedAt)
    if inserted is None:
        return None
    return inserted


async def get_comments(game_id: str, market: str, limit: int, cursor: str | None) -> tuple[list[dict], str | None]:
    """
    Get a page of comments for a game's market, newest first.

    cursor is the generatedAt of the last comment from the previous page
    (opaque to the client); None fetches the first page.

    Returns: (comments, next_cursor) where next_cursor is None when there are no more pages.
    """
    market = market.lower()
    if market not in ["moneyline", "spread", "total"]:
        return None
    opportunity_id = f"{game_id}_{market}"

    return get_user_comments(opportunity_id, limit, cursor)
