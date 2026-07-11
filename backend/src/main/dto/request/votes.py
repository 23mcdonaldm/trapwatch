from pydantic import BaseModel

class VotesRequest(BaseModel):
    game_id: str
    market: str
    side: str
