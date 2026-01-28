from datetime import datetime
import httpx

from config.settings import settings
from enums.league import LeagueKey
from repository.comments_repository import insert_user_comment


async def set_user_comment(game_id: str, user_id: str, market: str, comment: str, generatedAt: str) -> bool:
    print(f"Setting user comment for game_id: {game_id}, user_id: {user_id}, market: {market}, comment: {comment}, generatedAt: {generatedAt}")
    opportunity_id = f"{game_id}_{market}"
    market = market.lower()
    if market not in ["moneyline", "spread", "total"]:
        return None

    inserted = insert_user_comment(opportunity_id, user_id, comment, generatedAt)
    if inserted is None:
        return None
    return inserted

    