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
    # Accept either:
    # - ISO8601 datetime string (e.g. "2026-01-28T00:00:00-05:00")
    # - Plain ET date string "YYYY-MM-DD"
    date_str: str
    next_date_str: str
    if isinstance(dateET, str) and len(dateET) == 10 and dateET[4] == "-" and dateET[7] == "-":
        date_str = dateET
        d = datetime.strptime(dateET, "%Y-%m-%d")
        next_date_str = (d + timedelta(days=1)).strftime("%Y-%m-%d")
    else:
        dt = datetime.fromisoformat(dateET)
        start_of_day = dt.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        date_str = start_of_day.strftime("%Y-%m-%d")
        next_date_str = end_of_day.strftime("%Y-%m-%d")
    
    # gameTimeET is stored as string like "2026-01-09 07:30PM ET"
    # Format: "YYYY-MM-DD HH:MMAM/PM ET"
    # For string comparison, we can use date prefix matching:
    # - Start: "YYYY-MM-DD" (matches anything on that date)
    # - End: "YYYY-MM-DD" of next day (matches anything before that date)
    # Use string comparison: "2026-01-20" <= "2026-01-20 07:30PM ET" < "2026-01-21"
    events = (
        db.collection(GAMES_COLLECTION)
        .where("gameTimeET", ">=", date_str)
        .where("gameTimeET", "<", next_date_str)
        .get()
    )
    return events

def get_upcoming_events(todayET: str) -> Iterable["DocumentSnapshot"]:
    """
    Get every event from today (ET) forward — the look-ahead window.

    Deliberately bounded at today-or-later instead of a full-collection scan:
    completed games accumulate in the odds collection forever, while the
    forward window stays small (DK only lists ~30 days ahead).
    """
    db = get_db()
    return (
        db.collection(GAMES_COLLECTION)
        .where("gameTimeET", ">=", todayET)
        .get()
    )


def get_event_by_id(game_id: str) -> "DocumentSnapshot":
    """
    Get a single event document from the odds collection by its document id.
    """
    db = get_db()
    return db.collection(GAMES_COLLECTION).document(game_id).get()


def update_event_scores(game_id: str, fields: dict) -> None:
    """
    Merge score/status fields (finalScore, status, scoresUpdatedAt) onto an
    event document. Used by the scores poller.
    """
    db = get_db()
    db.collection(GAMES_COLLECTION).document(game_id).set(fields, merge=True)


def get_all_events_with_odds() -> Iterable["DocumentSnapshot"]:
    """
    Get all upcoming and future events from the odds collection
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    
    # gameTimeET is stored as string like "2026-01-20 10:00PM ET"
    # Get today's date string for comparison (YYYY-MM-DD format)
    # This will match all games from today onwards
    today_str = now.strftime("%Y-%m-%d")
    print("today_str: {}".format(today_str))
    
    # Query for events where gameTimeET >= today's date string
    # String comparison works: "2026-01-20" <= "2026-01-20 10:00PM ET" < "2026-01-21"
    events = db.collection(GAMES_COLLECTION).where("gameTimeET", ">=", today_str).get()
    return events
