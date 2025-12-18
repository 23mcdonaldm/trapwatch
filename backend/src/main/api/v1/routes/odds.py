from fastapi import APIRouter
from fastapi import HTTPException
from enums.league import LeagueKey
from dto.response.odds import OddsResponse
from service import odds_service

router = APIRouter(prefix="/odds", tags=["odds"])

def parse_league(league: str) -> LeagueKey:
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

# Get odds for a specific league
@router.get("/{league}", response_model=OddsResponse)
async def odds_league_route(league: str):
    lk = parse_league(league)
    fetched, upserted = await odds_service.get_odds(lk.value)
    return OddsResponse(
        leagueKey=lk.value,
        fetchedCount=fetched,
        upsertedCount=upserted,
    )

# Get all events
@router.get("", response_model=OddsResponse)
async def odds_all_route():
    fetched, upserted = await odds_service.get_all_odds()
    return OddsResponse(
        leagueKey=LeagueKey.ALL.value,
        fetchedCount=fetched,
        upsertedCount=upserted,
    )