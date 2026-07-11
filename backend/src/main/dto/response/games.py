from typing import Any, Optional
from pydantic import BaseModel


class GamesResponse(BaseModel):
    generatedAt: str
    dateET: str
    by_league: dict[str, Any]
    total: int


class GameResponse(BaseModel):
    generatedAt: str
    event: dict[str, Any]
    social: dict[str, Any] # market (lowercase) -> {counts, commentCount, latestComment}
