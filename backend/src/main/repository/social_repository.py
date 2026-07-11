from datetime import datetime, timezone, timedelta
from typing import Iterable, TYPE_CHECKING
from google.cloud import firestore
from repository.firestore import get_db

if TYPE_CHECKING:  # pragma: no cover
    from google.cloud.firestore import DocumentSnapshot

SOCIAL_COLLECTION = "social"

def get_social_aggregates(dateET: str) -> Iterable["DocumentSnapshot"]:
    """
    Get social aggregates for all opportunities of a given date.
    
    Queries the 'social' collection where generatedAt (stored as string like "2026-01-09 07:30PM ET")
    falls within the specified date's day range.
    """
    db = get_db()
    # Accept either:
    # - ISO8601 datetime string (e.g. "2026-01-28T00:00:00-05:00")
    # - Plain ET date string "YYYY-MM-DD"
    date_str: str
    next_date_str: str
    one_week_ago_str: str
    if isinstance(dateET, str) and len(dateET) == 10 and dateET[4] == "-" and dateET[7] == "-":
        date_str = dateET
        d = datetime.strptime(dateET, "%Y-%m-%d")
        next_date_str = (d + timedelta(days=1)).strftime("%Y-%m-%d")
        one_week_ago_str = (d - timedelta(days=7)).strftime("%Y-%m-%d")
    else:
        dt = datetime.fromisoformat(dateET)
        start_of_day = dt.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        date_str = start_of_day.strftime("%Y-%m-%d")
        next_date_str = end_of_day.strftime("%Y-%m-%d")
        one_week_ago_str = (start_of_day - timedelta(days=7)).strftime("%Y-%m-%d")
    # gameTimeET is stored as string like "2026-01-09 07:30PM ET"
    # Format: "YYYY-MM-DD HH:MMAM/PM ET"
    # For string comparison, we can use date prefix matching:
    # - Start: "YYYY-MM-DD" (matches anything on that date)
    # - End: "YYYY-MM-DD" of next day (matches anything before that date)
    # Use string comparison: "2026-01-20" <= "2026-01-20 07:30PM ET" < "2026-01-21"
    socials = (
        db.collection(SOCIAL_COLLECTION).get()
    )
    return socials


def get_social_aggregates_for_game(game_id: str) -> dict[str, dict]:
    """
    Get the social aggregate docs for a single game across all markets.

    Social doc ids are f"{game_id}_{market}" with lowercase market names.

    Returns: market (lowercase) -> aggregate dict, only for docs that exist.
    """
    db = get_db()
    aggregates: dict[str, dict] = {}
    for market in ("moneyline", "spread", "total"):
        snap = db.collection(SOCIAL_COLLECTION).document(f"{game_id}_{market}").get()
        if snap.exists:
            aggregates[market] = snap.to_dict()
    return aggregates