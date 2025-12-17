from fastapi import APIRouter
from fastapi import HTTPException
from enums.league import LeagueKey
from dto.response.events import EventsFetchResponse
from service import events_service

router = APIRouter(prefix="/events", tags=["events"])

def _parse_league(league: str) -> LeagueKey:
    """
    Accept either enum NAME (NFL) or enum VALUE (americanfootball_nfl).
    """
    if not league:
        raise HTTPException(status_code=422, detail="league is required")

    # Try name (NFL)
    key = league.upper()
    if key in LeagueKey.__members__:
        return LeagueKey[key]

    # Try value (americanfootball_nfl)
    try:
        return LeagueKey(league)
    except ValueError:
        allowed = [k.name for k in LeagueKey if k != LeagueKey.ALL]
        raise HTTPException(status_code=422, detail=f"Unknown league '{league}'. Try one of: {allowed}")

# Get events for a specific league
@router.get("/{league}", response_model=EventsFetchResponse)
async def events_league_route(league: str):
    lk = _parse_league(league)
    fetched, upserted = await events_service.get_events(lk.value)
    return EventsFetchResponse(
        leagueKey=lk.value,
        fetchedCount=fetched,
        upsertedCount=upserted,
    )

# Get all events
@router.get("", response_model=EventsFetchResponse)
async def events_all_route():
    fetched, upserted = await events_service.get_all_events()
    return EventsFetchResponse(
        leagueKey=LeagueKey.ALL.value,
        fetchedCount=fetched,
        upsertedCount=upserted,
    )


