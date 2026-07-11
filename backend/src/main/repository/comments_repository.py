from datetime import datetime, timezone, timedelta
from typing import Iterable, TYPE_CHECKING
from google.cloud import firestore
from repository.firestore import get_db
from enums.event_status import EventStatus

if TYPE_CHECKING:  # pragma: no cover
    from google.cloud.firestore import DocumentSnapshot

GAMES_COLLECTION = "social"
COMMENTS_SUBCOLLECTION = "comments"


def insert_user_comment(opportunity_id: str, user_id: str, display_name: str, comment: str, generatedAt: str) -> bool:
    """
    Insert a user comment for a given opportunity.

    
    Returns:
        bool: True if a new vote document was created, False if it already existed.
    """
    db = get_db()
    doc_ref = (
        db.collection(GAMES_COLLECTION)
        .document(opportunity_id)
        .collection(COMMENTS_SUBCOLLECTION)
        .document()
    )

    # Create new comment document
    doc_ref.set(
        {
            # Keep consistent with frontend naming (camelCase)
            "userId": user_id,
            "displayName": display_name,
            "comment": comment,
            "generatedAt": generatedAt,
        },
        merge=True,
    )
    return True
