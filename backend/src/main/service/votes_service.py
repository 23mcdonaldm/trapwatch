from datetime import datetime
import httpx

from config.settings import settings
from enums.league import LeagueKey
from repository.votes_repository import insert_user_vote
from repository.user_picks_repository import insert_user_pick
from repository.users_repository import ensure_user
from repository.get_events_repository import get_event_by_id


async def set_user_vote(game_id: str, user_id: str, display_name: str | None, market: str, side: str, generatedAt: str) -> bool:
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

    if inserted:
        # New vote → record it in the user's pick history and make sure the
        # profile doc exists (displayName source of truth for social features).
        ensure_user(user_id, display_name, generatedAt)

        event = get_event_by_id(game_id)
        event_data = event.to_dict() if event.exists else {}
        insert_user_pick(
            user_id=user_id,
            game_id=game_id,
            opportunity_id=opportunity_id,
            league=event_data.get("league", ""),
            market=market,
            side=side,
            gameTimeET=event_data.get("gameTimeET", ""),
            generatedAt=generatedAt,
        )

    return inserted
