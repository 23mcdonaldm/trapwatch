from enum import Enum

class EventStatus(str, Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    FINAL = "final"


class Market(str, Enum):
    moneyline = "Moneyline"
    spread = "Spread"
    total = "Total"