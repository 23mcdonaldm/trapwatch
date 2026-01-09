from fastapi import APIRouter
from fastapi import HTTPException
from enums.league import LeagueKey
from dto.response.csv_odds import CSVOddsResponse
from service import csv_odds_service

router = APIRouter(prefix="/csv-odds", tags=["csv-odds"])


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

# Get odds from the csv for a specific league
# @router.get("/{league}", response_model=OddsResponse)
# async def odds_league_route(league: str, dry_run: bool = False):
#     lk = parse_league(league)
#     fetched, upserted = await csv_odds_service.get_odds(lk.value, dry_run=dry_run)
#     return OddsResponse(
#         leagueKey=lk.value,
#         fetchedCount=fetched,
#         upsertedCount=upserted,
#     )

# Get all odds from the csv
@router.get("", response_model=CSVOddsResponse)
async def odds_all_route(dry_run: bool = False):
    fetched, upserted = await csv_odds_service.get_all_odds(dry_run=dry_run)
    return CSVOddsResponse(
        leagueKey=LeagueKey.ALL.value,
        fetchedCount=fetched,
        upsertedCount=upserted,
    )