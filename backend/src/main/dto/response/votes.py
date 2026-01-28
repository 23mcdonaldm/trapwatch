from pydantic import BaseModel


class VotesResponse(BaseModel):
    generatedAt: str
    vote: bool # True if the vote was set, False if it was already voted