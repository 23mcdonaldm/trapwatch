from pydantic import BaseModel


class VotesResponse(BaseModel):
    generatedAt: str