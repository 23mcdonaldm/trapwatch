from typing import TYPE_CHECKING

from google.cloud import firestore
from repository.firestore import get_db

if TYPE_CHECKING:  # pragma: no cover
    from google.cloud.firestore import DocumentSnapshot

USERS_COLLECTION = "users"


def ensure_user(user_id: str, display_name: str | None, generatedAt: str) -> dict:
    """
    Create the users/{user_id} profile doc if it doesn't exist yet.

    NOTE: the frontend also creates users/{uid} at signup (services/firestore.ts)
    with email/preferences/etc. — this function must merge, never clobber.

    displayName here is the source of truth for all social features. It is seeded
    from the Firebase token's name claim on the user's first authenticated write
    and NOT overwritten once set (a rename endpoint can come later). Legacy docs
    without a displayName get it backfilled.

    Returns the user doc's data (existing or newly created).
    """
    db = get_db()
    doc_ref = db.collection(USERS_COLLECTION).document(user_id)

    existing = doc_ref.get()
    if existing.exists:
        data = existing.to_dict()
        if not data.get("displayName") and display_name:
            doc_ref.set({"displayName": display_name, "updatedAt": generatedAt}, merge=True)
            data["displayName"] = display_name
        return data

    data = {
        "displayName": display_name or "Anonymous",
        "record": {"wins": 0, "losses": 0, "pushes": 0},
        "createdAt": generatedAt,
        "updatedAt": generatedAt,
    }
    doc_ref.set(data, merge=True)
    return data


def get_user(user_id: str) -> dict | None:
    """Fetch a user profile doc, or None if it doesn't exist."""
    db = get_db()
    snap = db.collection(USERS_COLLECTION).document(user_id).get()
    return snap.to_dict() if snap.exists else None


def get_leaderboard(limit: int) -> list[dict]:
    """
    Top users ordered by wins (desc).

    User docs also hold private signup fields (email, phoneNumber, preferences —
    written by the frontend at signup), so only the public subset is returned.
    Users without a record field (never graded) are excluded by the order_by.
    """
    db = get_db()
    snaps = (
        db.collection(USERS_COLLECTION)
        .order_by("record.wins", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .get()
    )
    results = []
    for snap in snaps:
        data = snap.to_dict()
        results.append(
            {
                "userId": snap.id,
                "displayName": data.get("displayName", "Anonymous"),
                "record": data.get("record", {"wins": 0, "losses": 0, "pushes": 0}),
            }
        )
    return results
