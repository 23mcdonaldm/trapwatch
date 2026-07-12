from repository.trap_results_repository import get_system_records

TIERS = ["TC", "TD", "TP", "overall"]


async def get_records() -> dict[str, dict]:
    """
    System records keyed by tier (TC, TD, TP, overall). Tiers with no graded
    results yet come back zeroed so the frontend can always render all four.
    """
    records = get_system_records()
    for tier in TIERS:
        records.setdefault(tier, {"wins": 0, "losses": 0, "pushes": 0})
    return records
