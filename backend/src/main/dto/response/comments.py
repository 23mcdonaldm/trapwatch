from typing import Any, Optional
from pydantic import BaseModel


class CommentsResponse(BaseModel):
    generatedAt: str
    comment: bool # True if the comment was set, False if it was already commented


class CommentsListResponse(BaseModel):
    generatedAt: str
    comments: list[dict[str, Any]]
    nextCursor: Optional[str] = None # generatedAt cursor for the next page; null on last page
