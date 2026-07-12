from typing import Any, Optional
from pydantic import BaseModel


class GamesResponse(BaseModel):
    generatedAt: str
    dateET: str
    by_league: dict[str, Any]
    total: int


class GamesUpcomingResponse(BaseModel):
    generatedAt: str
    todayET: str
    # days ordered ascending: [{dateET, by_league: {leagueKey: summary[]}, total}]
    days: list[dict[str, Any]]
    total: int


class GameResponse(BaseModel):
    generatedAt: str
    event: dict[str, Any]
    social: dict[str, Any] # market (lowercase) -> {counts, commentCount, latestComment}


class GameHistoryResponse(BaseModel):
    generatedAt: str
    gameId: str
    # Snapshot series, oldest first. moneyline: {t, home, away};
    # spread: {t, line, home, away}; total: {t, line, over, under} —
    # each side is {odds, betsPct, handlePct}.
    moneyline: list[dict[str, Any]]
    spread: list[dict[str, Any]]
    total: list[dict[str, Any]]
