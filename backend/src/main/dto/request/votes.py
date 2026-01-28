from pydantic import BaseModel

class VotesRequest(BaseModel):
    game_id: str
    user_id: str
    market: str
    side: str
