from datetime import datetime
import httpx

from config.settings import settings
from enums.league import LeagueKey
from repository.votes_repository import insert_user_vote


async def set_user_vote(game_id: str, user_id: str, market: str, side: str, generatedAt: str) -> bool:
    print(f"Setting user vote for game_id: {game_id}, user_id: {user_id}, market: {market}, side: {side}, generatedAt: {generatedAt}")
    # Lowercase BEFORE building opportunity_id so it matches the id the feed
    # reads aggregates from (feed_service uses f"{id}_{market.lower()}").
    market = market.lower()
    side = side.lower()
    if market not in ["moneyline", "spread", "total"]:
        return None
    if side not in ["home", "away", "over", "under"]:
        return None
    opportunity_id = f"{game_id}_{market}"

    inserted = insert_user_vote(opportunity_id, user_id, side, generatedAt)
    if inserted is None:
        return None
    return inserted

    