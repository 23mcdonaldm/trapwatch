from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable

from repository.firestore import get_db

# Where events are stored (matches events_repository.py)
EVENTS_COLLECTION = "events"

# Per-event odds history subcollection name (requested by user)
HISTORY_SUBCOLLECTION = "history"

def _to_iso_utc_z(value: Any) -> str:
    """
    Normalize a timestamp-like value to an ISO-8601 UTC string ending with 'Z'.

    Accepts:
      - None: uses current time (UTC)
      - datetime: converted to UTC
      - str: returned as-is if already endswith 'Z', otherwise normalize '+00:00' to 'Z'
    """
    if value is None:
        dt = datetime.now(timezone.utc)
        return dt.isoformat().replace("+00:00", "Z")

    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return dt.isoformat().replace("+00:00", "Z")

    if isinstance(value, str):
        s = value.strip()
        if s.endswith("Z"):
            return s
        # Common variant if parsed earlier: "...+00:00"
        if s.endswith("+00:00"):
            return s[:-6] + "Z"
        return s

    # Last resort: stringify
    return str(value)


def upsert_current_odds(
    updates: Iterable[dict[str, Any]],
) -> int:
    """
    For each update:
      - sets `home_ml`, 'away_ml', 'home_spread', 'away_spread', 'home_spread_price', 'away_spread_price' and `last_updated_odds` on events/{gameId}
      - appends a doc to events/{gameId}/history with {ml's, spreads, timestamp}

    Expected input keys per dict:
      - gameId: str
      - home_ml: Any (JSON-serializable)
      - away_ml: Any (JSON-serializable)
      - home_spread: Any (JSON-serializable)
      - home_spread_price: Any (JSON-serializable)
      - away_spread: Any (JSON-serializable)
      - away_spread_price: Any (JSON-serializable)
      - last_updated_odds: ISO-8601 string (optional; defaults to now UTC in ISO-8601)
    """
    db = get_db()
    batch = db.batch()

    ops = 0
    updated = 0

    for u in updates:
        game_id = u["gameId"]

        event_ref = db.collection(EVENTS_COLLECTION).document(game_id)
        history_ref = event_ref.collection(HISTORY_SUBCOLLECTION).document()

        current_home_ml = u.get("home_ml")
        current_away_ml = u.get("away_ml")
        current_home_spread = u.get("home_spread")
        current_home_spread_price = u.get("home_spread_price")
        current_away_spread = u.get("away_spread")
        current_away_spread_price = u.get("away_spread_price")
        last_updated_odds = u.get("last_updated_odds")
        bookmaker = u.get("bookmaker")
        # Always store oddsUpdatedAt as ISO-8601 UTC '...Z' string for consistency.
        last_updated_odds = _to_iso_utc_z(last_updated_odds)

        # 1) Update event doc with current values
        batch.set(
            event_ref,
            {
                "home_ml": current_home_ml,
                "away_ml": current_away_ml,
                "home_spread": current_home_spread,
                "home_spread_price": current_home_spread_price,
                "away_spread": current_away_spread,
                "away_spread_price": current_away_spread_price,
                "oddsUpdatedAt": last_updated_odds,
                "bookmaker": bookmaker,
            },
            merge=True,
        )
        ops += 1

        # 2) Append to history subcollection
        batch.set(
            history_ref,
            {
                "home_ml": current_home_ml,
                "away_ml": current_away_ml,
                "home_spread": current_home_spread,
                "home_spread_price": current_home_spread_price,
                "away_spread": current_away_spread,
                "away_spread_price": current_away_spread_price,
                "oddsUpdatedAt": last_updated_odds,
                "bookmaker": bookmaker,
            },
        )
        ops += 1

        updated += 1

        # Firestore batch limit is 500 writes; we do 2 writes per event.
        if ops >= 450:
            batch.commit()
            batch = db.batch()
            ops = 0

    if ops > 0:
        batch.commit()

    return updated
