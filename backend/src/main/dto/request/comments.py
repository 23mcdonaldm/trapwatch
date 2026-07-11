from pydantic import BaseModel

class CommentsRequest(BaseModel):
    game_id: str
    display_name: str
    market: str
    comment: str
