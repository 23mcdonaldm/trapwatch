from pydantic import BaseModel


class OddsResponse(BaseModel):
    leagueKey: str
    fetchedCount: int
    upsertedCount: int