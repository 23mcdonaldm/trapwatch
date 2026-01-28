from datetime import datetime, timezone, timedelta
from typing import Iterable, TYPE_CHECKING
from google.cloud import firestore
from repository.firestore import get_db
from enums.event_status import EventStatus

if TYPE_CHECKING:  # pragma: no cover
    from google.cloud.firestore import DocumentSnapshot

GAMES_COLLECTION = "social"
VOTES_SUBCOLLECTION = "votes"


def insert_user_vote(opportunity_id: str, user_id: str, side: str, generatedAt: str) -> bool:
    """
    Insert a user vote for a given opportunity.

    If a document for this user_id already exists under the opportunity, the vote
    is NOT changed and the function returns False so we don't double‑count.

    Returns:
        bool: True if a new vote document was created, False if it already existed.
    """
    db = get_db()
    doc_ref = (
        db.collection(GAMES_COLLECTION)
        .document(opportunity_id)
        .collection(VOTES_SUBCOLLECTION)
        .document(user_id)
    )

    # Check if this user has already voted on this opportunity
    existing = doc_ref.get()
    if existing.exists:
        # User already has a vote recorded; do not overwrite / double‑count
        return False

    # Create new vote document
    doc_ref.set(
        {
            "side": side,  # "home" | "away" | "over" | "under"
            "generatedAt": generatedAt,
        },
        merge=True,
    )
    return True
