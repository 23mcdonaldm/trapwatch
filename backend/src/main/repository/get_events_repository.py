from datetime import datetime, timezone, timedelta
from typing import Iterable, TYPE_CHECKING
from google.cloud import firestore
from repository.firestore import get_db
from enums.event_status import EventStatus

if TYPE_CHECKING:  # pragma: no cover
    from google.cloud.firestore import DocumentSnapshot

GAMES_COLLECTION = "odds"

def get_events(dateET: str) -> Iterable["DocumentSnapshot"]:
    """
    Get events for a given date.
    
    Queries the 'odds' collection where gameTimeET (stored as string like "2026-01-09 07:30PM ET")
    falls within the specified date's day range.
    """
    db = get_db()
    # Parse the provided datetime string and compute the start/end of that day
    # We assume dateET is an ISO8601 string with timezone information, e.g. produced by datetime.isoformat().
    dt = datetime.fromisoformat(dateET)
    start_of_day = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    # gameTimeET is stored as string like "2026-01-09 07:30PM ET"
    # Format: "YYYY-MM-DD HH:MMAM/PM ET"
    # For string comparison, we can use date prefix matching:
    # - Start: "YYYY-MM-DD" (matches anything on that date)
    # - End: "YYYY-MM-DD" of next day (matches anything before that date)
    date_str = start_of_day.strftime("%Y-%m-%d")
    next_date_str = end_of_day.strftime("%Y-%m-%d")
    
    # Use string comparison: "2026-01-20" <= "2026-01-20 07:30PM ET" < "2026-01-21"
    events = (
        db.collection(GAMES_COLLECTION)
        .where("gameTimeET", ">=", date_str)
        .where("gameTimeET", "<", next_date_str)
        .get()
    )
    return events

def get_all_events_with_odds() -> Iterable["DocumentSnapshot"]:
    """
    Get all upcoming and future events from the odds collection
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    events = db.collection(GAMES_COLLECTION).where("commenceTime", ">=", now).get()
    return events
