from pydantic import BaseModel
from typing import Any


class SystemRecordsResponse(BaseModel):
    generatedAt: str
    # Keyed by tier: TC | TD | TP | overall -> {wins, losses, pushes, updatedAt}
    records: dict[str, dict[str, Any]]


class LeaderboardResponse(BaseModel):
    generatedAt: str
    leaderboard: list[dict[str, Any]]
