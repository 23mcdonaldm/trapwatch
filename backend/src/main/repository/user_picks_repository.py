from typing import TYPE_CHECKING

from google.cloud import firestore
from repository.firestore import get_db

if TYPE_CHECKING:  # pragma: no cover
    from google.cloud.firestore import DocumentSnapshot

USER_PICKS_COLLECTION = "user_picks"
USERS_COLLECTION = "users"


def _pick_doc_id(user_id: str, game_id: str, market: str) -> str:
    # One pick per user per opportunity, mirroring the votes dedup
    # (votes live at social/{oppId}/votes/{userId}).
    return f"{user_id}_{game_id}_{market}"


def insert_user_pick(
    user_id: str,
    game_id: str,
    opportunity_id: str,
    league: str,
    market: str,
    side: str,
    gameTimeET: str,
    generatedAt: str,
) -> bool:
    """
    Record a pick in the user's history. Doc ID is deterministic so a duplicate
    vote can never create a second pick.

    Returns True if a new pick was created, False if it already existed.
    """
    db = get_db()
    doc_ref = db.collection(USER_PICKS_COLLECTION).document(_pick_doc_id(user_id, game_id, market))

    existing = doc_ref.get()
    if existing.exists:
        return False

    doc_ref.set(
        {
            "userId": user_id,
            "gameId": game_id,
            "opportunityId": opportunity_id,
            "league": league,
            "market": market,
            "side": side,  # "home" | "away" | "over" | "under"
            "gameTimeET": gameTimeET,
            "result": "pending",
            "generatedAt": generatedAt,
            "evaluatedAt": None,
        }
    )
    return True


def get_pending_picks_for_market(game_id: str, market: str) -> list["DocumentSnapshot"]:
    """All ungraded picks for one game's market (evaluation query)."""
    db = get_db()
    return list(
        db.collection(USER_PICKS_COLLECTION)
        .where("gameId", "==", game_id)
        .where("market", "==", market)
        .where("result", "==", "pending")
        .get()
    )


def get_user_picks(user_id: str, limit: int, cursor: str | None) -> tuple[list[dict], str | None]:
    """
    A page of a user's picks, newest first. cursor is the generatedAt of the last
    pick from the previous page (opaque to the client); None fetches the first page.

    Returns: (picks, next_cursor) where next_cursor is None when there are no more pages.
    """
    db = get_db()
    query = (
        db.collection(USER_PICKS_COLLECTION)
        .where("userId", "==", user_id)
        .order_by("generatedAt", direction=firestore.Query.DESCENDING)
    )
    if cursor:
        query = query.start_after({"generatedAt": cursor})

    # Fetch one extra to know whether another page exists.
    snaps = list(query.limit(limit + 1).get())
    has_more = len(snaps) > limit
    snaps = snaps[:limit]

    picks = [snap.to_dict() for snap in snaps]
    next_cursor = picks[-1]["generatedAt"] if has_more and picks else None
    return picks, next_cursor


def grade_pick_and_update_record(pick_snap: "DocumentSnapshot", result: str, evaluatedAt: str) -> None:
    """
    Transactionally set a pick's result and bump the owner's running record.
    Skips silently if the pick was graded by a concurrent run (idempotency).
    """
    db = get_db()
    transaction = db.transaction()
    pick_ref = pick_snap.reference
    user_ref = db.collection(USERS_COLLECTION).document(pick_snap.get("userId"))
    field = {"win": "wins", "loss": "losses", "push": "pushes"}[result]

    @firestore.transactional
    def _grade(tx):
        fresh = pick_ref.get(transaction=tx)
        if not fresh.exists or fresh.get("result") != "pending":
            return
        tx.update(pick_ref, {"result": result, "evaluatedAt": evaluatedAt})
        tx.set(
            user_ref,
            {"record": {field: firestore.Increment(1)}, "updatedAt": evaluatedAt},
            merge=True,
        )

    _grade(transaction)
