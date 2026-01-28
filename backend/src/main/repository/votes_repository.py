from datetime import datetime, timezone, timedelta
from typing import Iterable, TYPE_CHECKING
from google.cloud import firestore
from repository.firestore import get_db
from enums.event_status import EventStatus

if TYPE_CHECKING:  # pragma: no cover
    from google.cloud.firestore import DocumentSnapshot

GAMES_COLLECTION = "votes"
VOTES_SUBCOLLECTION = "userVotes"

def insert_user_vote(opportunity_id: str, user_id: str, side: str, generatedAt: str):
    db = get_db()
    doc_ref = db.collection(GAMES_COLLECTION).document(opportunity_id).collection(VOTES_SUBCOLLECTION).document(user_id)
    doc_ref.set({
        "side": side, # "home" | "away" | "over" | "under"
        "generatedAt": generatedAt,
    }, merge=True)
    return True
