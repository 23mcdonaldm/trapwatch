from pydantic import BaseModel


class CommentsResponse(BaseModel):
    generatedAt: str
    comment: bool # True if the comment was set, False if it was already commented