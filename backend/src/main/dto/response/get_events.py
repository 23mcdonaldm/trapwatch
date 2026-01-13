from typing import Any
from pydantic import BaseModel


class GetEventsResponse(BaseModel):
    generatedAt: str
    dateET: str
    traps: dict[str, Any]
    by_league: dict[str, Any]
