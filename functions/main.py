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


@on_document_written(document="votes/{opportunityId}/userVotes/{userId}")
def on_user_vote_write(event: Change[DocumentSnapshot | None]) -> None:
    db = firestore.client()

    opportunity_id = event.params["opportunityId"]

    before = event.data.before.to_dict() if event.data.before is not None else None
    after  = event.data.after.to_dict()  if event.data.after  is not None else None

    before_side = before.get("side") if before else None
    after_side  = after.get("side")  if after  else None

    if before_side == after_side:
        return

    agg_ref = db.collection("votes").document(opportunity_id)

    updates = {"updatedAt": firestore.SERVER_TIMESTAMP}

    if before_side:
        updates[f"counts.{before_side}"] = firestore.Increment(-1)

    if after_side:
        updates[f"counts.{after_side}"] = firestore.Increment(1)

    agg_ref.set(updates, merge=True)