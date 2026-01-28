# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

# from firebase_functions import https_fn
# from firebase_functions.options import set_global_options
# from firebase_functions.core import Event
from firebase_functions import https_fn
from firebase_functions.options import set_global_options
from firebase_functions.firestore_fn import on_document_written, Change, DocumentSnapshot
from firebase_admin import initialize_app, firestore

# @https_fn.on_request()
# def on_request_example(req: https_fn.Request) -> https_fn.Response:
#     return https_fn.Response("Hello world!")

# For cost control, you can set the maximum number of containers that can be
# running at the same time. This helps mitigate the impact of unexpected
# traffic spikes by instead downgrading performance. This limit is a per-function
# limit. You can override the limit for each function using the max_instances
# parameter in the decorator, e.g. @https_fn.on_request(max_instances=5).

set_global_options(max_instances=10)

initialize_app()


@on_document_written(document="social/{opportunityId}/votes/{userId}")
def on_user_vote_write(event: Change[DocumentSnapshot | None]) -> None:
    print("TRIGGER FIRED ON USER VOTE WRITE", event.params)
    db = firestore.client()

    opportunity_id = event.params["opportunityId"]

    before = event.data.before.to_dict() if event.data.before is not None else None
    after  = event.data.after.to_dict()  if event.data.after  is not None else None

    before_side_raw = before.get("side") if before else None
    after_side_raw = after.get("side") if after else None

    # Normalize side values to avoid case/format mismatches (e.g. "Home" vs "home")
    def _norm_side(v) -> str | None:
        if v is None:
            return None
        s = str(v).strip().lower()
        if s in {"home", "away", "over", "under"}:
            return s
        return None

    before_side = _norm_side(before_side_raw)
    after_side = _norm_side(after_side_raw)

    if before_side == after_side:
        return

    agg_ref = db.collection("social").document(opportunity_id)

    @firestore.transactional
    def _txn_update_counts(txn: firestore.Transaction) -> None:
        snap = agg_ref.get(transaction=txn)
        agg = snap.to_dict() if snap.exists else {}

        # Start from existing counts, but default missing to 0
        counts = dict((agg.get("counts") or {}))
        for k in ("home", "away", "over", "under"):
            v = counts.get(k)
            counts[k] = int(v) if isinstance(v, (int, float)) else 0

        # Apply transition deterministically
        # - Create: before is None, after has side => +1 on after_side
        # - Update: before_side != after_side => -1 on before_side, +1 on after_side
        # - Delete: after is None, before has side => -1 on before_side
        if before_side is None and after_side is not None:
            counts[after_side] += 1
        elif before_side is not None and after_side is None:
            counts[before_side] -= 1
        elif before_side is not None and after_side is not None and before_side != after_side:
            counts[before_side] -= 1
            counts[after_side] += 1

        # Never allow negative counts (prevents weird -3 starts if duplicate events happen)
        for k in ("home", "away", "over", "under"):
            if counts[k] < 0:
                counts[k] = 0

        txn.set(
            agg_ref,
            {"updatedAt": firestore.SERVER_TIMESTAMP, "counts": counts},
            merge=True,
        )

    _txn_update_counts(db.transaction())



@on_document_written(document="social/{opportunityId}/comments/{commentId}")
def on_user_comment_write(event: Change[DocumentSnapshot | None]) -> None:
    print("TRIGGER FIRED ON USER COMMENT WRITE", event.params)
    db = firestore.client()

    opportunity_id = event.params["opportunityId"]
    comment_id = event.params["commentId"]

    before = event.data.before.to_dict() if event.data.before is not None else None
    after = event.data.after.to_dict() if event.data.after is not None else None

    # Determine operation type
    is_create = before is None and after is not None
    is_delete = before is not None and after is None
    is_update = before is not None and after is not None

    agg_ref = db.collection("social").document(opportunity_id)

    # Helper to build a latestComment payload from a comment doc
    def _build_latest(doc: dict) -> dict:
        # support both userId and user_id
        uid = doc.get("userId") or doc.get("user_id")
        return {
            "commentId": comment_id,
            "userId": uid,
            "comment": doc.get("comment"),
            "generatedAt": doc.get("generatedAt"),
        }

    @firestore.transactional
    def _txn_update_comment_agg(txn: firestore.Transaction) -> dict:
        snap = agg_ref.get(transaction=txn)
        agg = snap.to_dict() if snap.exists else {}

        comment_count = agg.get("commentCount")
        comment_count = int(comment_count) if isinstance(comment_count, (int, float)) else 0

        latest = agg.get("latestComment") or {}
        latest_generated_at = latest.get("generatedAt") if isinstance(latest, dict) else None
        latest_comment_id = latest.get("commentId") if isinstance(latest, dict) else None

        # Update count
        if is_create:
            comment_count += 1
        elif is_delete:
            comment_count -= 1

        if comment_count < 0:
            comment_count = 0

        updates: dict = {
            "updatedAt": firestore.SERVER_TIMESTAMP,
            "commentCount": comment_count,
        }

        # Update latest comment on create/update if it's >= existing latest by generatedAt (string ISO compare works)
        if after is not None and (is_create or is_update):
            after_gen = after.get("generatedAt")
            if latest_generated_at is None or (after_gen is not None and str(after_gen) >= str(latest_generated_at)):
                updates["latestComment"] = _build_latest(after)

        # If we deleted the latest comment, clear it for now (we'll recompute below)
        needs_recompute_latest = False
        if is_delete and latest_comment_id == comment_id:
            updates["latestComment"] = None
            needs_recompute_latest = True

        txn.set(agg_ref, updates, merge=True)
        return {"needs_recompute_latest": needs_recompute_latest}

    result = _txn_update_comment_agg(db.transaction())

    # If the latest comment was deleted, recompute by querying the newest remaining comment
    if is_delete and result.get("needs_recompute_latest"):
        try:
            newest = (
                db.collection("social")
                .document(opportunity_id)
                .collection("comments")
                .order_by("generatedAt", direction=firestore.Query.DESCENDING)
                .limit(1)
                .get()
            )
            if newest:
                snap = newest[0]
                doc = snap.to_dict() or {}
                agg_ref.set(
                    {
                        "updatedAt": firestore.SERVER_TIMESTAMP,
                        "latestComment": {
                            "commentId": snap.id,
                            "userId": doc.get("userId") or doc.get("user_id"),
                            "comment": doc.get("comment"),
                            "generatedAt": doc.get("generatedAt"),
                        },
                    },
                    merge=True,
                )
        except Exception as e:
            # Don't fail the trigger; logs will show if recompute failed
            print("Failed to recompute latestComment", e)



