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


def get_user_comments(opportunity_id: str, limit: int, cursor: str | None) -> tuple[list[dict], str | None]:
    """
    Get a page of comments for a given opportunity, newest first.

    cursor is the generatedAt value of the last comment of the previous page.
    Fetches limit+1 docs to know whether another page exists.

    Returns:
        (comments, next_cursor): comments as dicts (with "id"), next_cursor is
        None when this is the last page.
    """
    db = get_db()
    query = (
        db.collection(GAMES_COLLECTION)
        .document(opportunity_id)
        .collection(COMMENTS_SUBCOLLECTION)
        .order_by("generatedAt", direction=firestore.Query.DESCENDING)
    )
    if cursor:
        query = query.start_after({"generatedAt": cursor})

    docs = query.limit(limit + 1).get()

    comments = []
    for doc in docs[:limit]:
        data = doc.to_dict() or {}
        data["id"] = doc.id
        comments.append(data)

    next_cursor = comments[-1]["generatedAt"] if len(docs) > limit and comments else None
    return comments, next_cursor
