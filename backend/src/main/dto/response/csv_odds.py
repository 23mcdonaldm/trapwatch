from pydantic import BaseModel


class CSVOddsResponse(BaseModel):
    leagueKey: str
    fetchedCount: int
    upsertedCount: int