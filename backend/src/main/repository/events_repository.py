from datetime import datetime, timezone
from typing import Iterable
from google.cloud import firestore
from repository.firestore import get_db
from enums.event_status import EventStatus

GAMES_COLLECTION = "events"

def upsert_events(games: Iterable[dict]) -> int:
    """
    Upserts game docs into Firestore using a batch write.
    Each game must contain: gameId, leagueKey, commenceTime, homeTeam, awayTeam
    """
    db = get_db()
    batch = db.batch()

    now = datetime.now(timezone.utc)

    count = 0
    for g in games:
        game_id = g["gameId"]
        doc_ref = db.collection(GAMES_COLLECTION).document(game_id)
        batch.set(doc_ref, {
            "leagueKey": g["leagueKey"],
            "commenceTime": g["commenceTime"],
            "homeTeam": g["homeTeam"],
            "awayTeam": g["awayTeam"],
            "lastSeenAt": now,
            "status": EventStatus.UNSTARTED.value
        }, merge=True)
        count += 1

        # Firestore batch limit is 500 ops
        if count % 450 == 0:
            batch.commit()
            batch = db.batch()

    if count % 450 != 0:
        batch.commit()

    return count
