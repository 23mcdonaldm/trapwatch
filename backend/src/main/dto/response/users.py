from pydantic import BaseModel
from typing import Any


class UserRecord(BaseModel):
    wins: int
    losses: int
    pushes: int


class UserRecordResponse(BaseModel):
    generatedAt: str
    userId: str
    displayName: str
    record: UserRecord


class UserPicksResponse(BaseModel):
    generatedAt: str
    picks: list[dict[str, Any]]
    nextCursor: str | None
