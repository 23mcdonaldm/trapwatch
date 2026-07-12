from typing import TYPE_CHECKING

from google.cloud import firestore
from repository.firestore import get_db

if TYPE_CHECKING:  # pragma: no cover
    from google.cloud.firestore import DocumentSnapshot

TRAP_RESULTS_COLLECTION = "trap_results"
SYSTEM_RECORDS_COLLECTION = "system_records"


def record_trap_result(
    opportunity_id: str,
    game_id: str,
    league: str,
    market: str,
    status: str,
    status_side: str,
    outcome: str,
    final_score: dict,
    evaluatedAt: str,
) -> bool:
    """
    Write the graded outcome for one flagged market and bump the system records
    for its tier + overall, all in a transaction.

    Idempotent: if trap_results/{opportunity_id} already exists, nothing changes
    and False is returned.
    """
    db = get_db()
    transaction = db.transaction()
    result_ref = db.collection(TRAP_RESULTS_COLLECTION).document(opportunity_id)
    tier_ref = db.collection(SYSTEM_RECORDS_COLLECTION).document(status)
    overall_ref = db.collection(SYSTEM_RECORDS_COLLECTION).document("overall")
    field = {"win": "wins", "loss": "losses", "push": "pushes"}[outcome]

    @firestore.transactional
    def _record(tx) -> bool:
        existing = result_ref.get(transaction=tx)
        if existing.exists:
            return False
        tx.set(
            result_ref,
            {
                "gameId": game_id,
                "league": league,
                "market": market,
                "status": status,
                "statusSide": status_side,
                "outcome": outcome,
                "finalScore": final_score,
                "evaluatedAt": evaluatedAt,
            },
        )
        increment = {field: firestore.Increment(1), "updatedAt": evaluatedAt}
        tx.set(tier_ref, increment, merge=True)
        tx.set(overall_ref, increment, merge=True)
        return True

    return _record(transaction)


def get_system_records() -> dict[str, dict]:
    """All system record docs keyed by tier id (TC, TD, TP, overall)."""
    db = get_db()
    records = {}
    for snap in db.collection(SYSTEM_RECORDS_COLLECTION).get():
        records[snap.id] = snap.to_dict()
    return records
