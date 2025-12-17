from pydantic import BaseModel


class EventsFetchResponse(BaseModel):
    leagueKey: str
    fetchedCount: int
    upsertedCount: int


