from pydantic import BaseModel


class TrapsResponse(BaseModel):
    generatedAt: str
    TC_count: int  # Trap City count
    TC_games_ids: list[str]
    TD_count: int  # Trap Detected count
    TD_games_ids: list[str]
    TP_count: int  # Trap Potential count
    TP_games_ids: list[str]
    total_processed: int