from enum import Enum

class EventStatus(str, Enum):
    UNSTARTED = "unstarted"
    LIVE = "live"
    COMPLETED = "completed"


class Market(str, Enum):
    moneyline = "Moneyline"
    spread = "Spread"
    total = "Total"