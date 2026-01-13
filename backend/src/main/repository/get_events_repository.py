from datetime import datetime, timezone
from typing import Iterable
from google.cloud import firestore
from repository.firestore import get_db
from enums.event_status import EventStatus

GAMES_COLLECTION = "odds"

def get_events(dateET: str) -> Iterable[firestore.DocumentSnapshot]:
    """
    Get events for a given date
    """
    db = get_db()
    events = db.collection(GAMES_COLLECTION).where("commenceTime", ">=", dateET).get()
    return events

def get_all_events_with_odds() -> Iterable[firestore.DocumentSnapshot]:
    """
    Get all events from the odds collection
    """
    db = get_db()
    events = db.collection(GAMES_COLLECTION).get()
    return events
