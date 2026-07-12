from pydantic import BaseModel

class CommentsRequest(BaseModel):
    game_id: str
    market: str
    comment: str
