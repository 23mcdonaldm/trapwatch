from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from dto.response.games import GamesResponse, GameResponse
from service import games_service

router = APIRouter(prefix="/games", tags=["games"])


# Get ALL games for a date, grouped by league (not just traps)
@router.get("", response_model=GamesResponse)
async def games_route(dateET: Optional[str] = Query(None, description="ET date string (YYYY-MM-DD) or ISO datetime; defaults to today")):
    generatedAt = datetime.now(timezone.utc).isoformat()

    # Use provided dateET or default to today
    if dateET:
        dateET_parsed = dateET
    else:
        dateET_parsed = datetime.now(timezone.utc).isoformat()

    by_league, total = await games_service.get_games(dateET_parsed)

    return GamesResponse(
        generatedAt=generatedAt,
        dateET=dateET_parsed,
        by_league=by_league,
        total=total,
    )


# Get a single game by id with its social aggregates
@router.get("/{game_id}", response_model=GameResponse)
async def game_route(game_id: str):
    generatedAt = datetime.now(timezone.utc).isoformat()

    result = await games_service.get_game(game_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Game '{game_id}' not found")
    event, social = result

    return GameResponse(
        generatedAt=generatedAt,
        event=event,
        social=social,
    )
