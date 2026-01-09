from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable

from repository.firestore import get_db
from enums.event_status import EventStatus

# Collection name for CSV odds data
CSV_ODDS_COLLECTION = "odds"

# Per-game history subcollection names
ML_HISTORY_SUBCOLLECTION = "ml_history"
SPREAD_HISTORY_SUBCOLLECTION = "spread_history"
TOTAL_HISTORY_SUBCOLLECTION = "total_history"


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


def _to_firestore_timestamp(value: Any) -> datetime:
    """
    Convert a value to a Firestore-compatible datetime (UTC).
    If None, returns current UTC time.
    """
    if value is None:
        return datetime.now(timezone.utc)

    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return dt

    if isinstance(value, str):
        # Try parsing ISO format
        try:
            # Handle 'Z' suffix
            s = value.replace("Z", "+00:00")
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
            return dt
        except Exception:
            pass

    # Last resort: use current time
    return datetime.now(timezone.utc)


def upsert_csv_odds(
    updates: dict[str, dict[str, Any]],
) -> int:
    """
    Upsert CSV odds data into Firestore with the new schema.

    For each update:
      - Sets/merges the main game document with metadata and current_odds
      - Appends docs to {gameId}/ml_history, {gameId}/spread_history, and/or {gameId}/total_history
        subcollections if corresponding history entries are present

    Expected input keys per dict:
      - id: str (e.g., "ncaaf_2026-01-01_alabama_georgia")
      - league: str (e.g., "ncaaf")
      - gameDateET: str (e.g., "2026-01-01")
      - gameTimeET: str (e.g., "19:00")
      - homeTeam: str
      - awayTeam: str
      - status: str (e.g., "scheduled" | "live" | "final")
      - lastUpdatedAt: datetime | str | None (optional; defaults to now UTC)
      - current_odds: dict with structure:
        {
          "ml": {
            "home": {"odds": int, "handlePct": float, "betsPct": float, "diff": float, "flag": str | None},
            "away": {"odds": int, "handlePct": float, "betsPct": float, "diff": float, "flag": str | None}
          },
          "spread": {
            "line": float,
            "home": {"odds": int, "handlePct": float, "betsPct": float},
            "away": {"odds": int, "handlePct": float, "betsPct": float}
          },
          "total": {
            "line": float,
            "over": {"odds": int, "handlePct": float, "betsPct": float},
            "under": {"odds": int, "handlePct": float, "betsPct": float}
          }
        }
      - ml_history_entry: dict | None (optional; if present, appends to ml_history subcollection):
        {
          "runTimestamp": str (ISO-8601),
          "home": {"odds": int, "handlePct": float, "betsPct": float, "diff": float},
          "away": {"odds": int, "handlePct": float, "betsPct": float, "diff": float}
        }
      - spread_history_entry: dict | None (optional; if present, appends to spread_history subcollection):
        {
          "runTimestamp": str (ISO-8601),
          "line": float,
          "home": {"odds": int, "handlePct": float, "betsPct": float},
          "away": {"odds": int, "handlePct": float, "betsPct": float}
        }
      - total_history_entry: dict | None (optional; if present, appends to total_history subcollection):
        {
          "runTimestamp": str (ISO-8601),
          "line": float,
          "over": {"odds": int, "handlePct": float, "betsPct": float},
          "under": {"odds": int, "handlePct": float, "betsPct": float}
        }
    """
    db = get_db()
    batch = db.batch()

    ops = 0
    updated = 0

    for game_id, odds in updates.items():
        ml_odds = odds.get("Moneyline")
        spread_odds = odds.get("Spread")
        total_odds = odds.get("Total")

        # "{league.value}_{gametime}_{home_team}_{away_team}"
        league, gametime, home_team, away_team = game_id.split("_")

        game_ref = db.collection(CSV_ODDS_COLLECTION).document(game_id)
        ml_history_ref = game_ref.collection(ML_HISTORY_SUBCOLLECTION).document()
        spread_history_ref = game_ref.collection(SPREAD_HISTORY_SUBCOLLECTION).document()
        total_history_ref = game_ref.collection(TOTAL_HISTORY_SUBCOLLECTION).document()

        # Use current time for lastUpdatedAt and runTimestamp (when this odds update was processed)
        now = datetime.now(timezone.utc)
        last_updated_at_ts = now

        # Build current_odds from the odds dict
        current_odds: dict[str, Any] = {}
        if ml_odds:
            current_odds["Moneyline"] = ml_odds
        if spread_odds:
            current_odds["Spread"] = spread_odds
        if total_odds:
            current_odds["Total"] = total_odds

        # Build main document data
        doc_data: dict[str, Any] = {
            "id": game_id,
            "league": league,  # league is already a string from game_id split
            "gameTimeET": gametime,
            "homeTeam": home_team,
            "awayTeam": away_team,
            "status": EventStatus.SCHEDULED.value,
            "lastUpdatedAt": last_updated_at_ts,
            "currentOdds": current_odds,
        }

        # 1) Upsert main game document
        batch.set(game_ref, doc_data, merge=True)
        ops += 1

        # Use the same timestamp for all history entries (when this odds update was processed)
        run_timestamp_iso = _to_iso_utc_z(now)
        run_timestamp_ts = now

        # 2) Append to ml_history subcollection if ML odds are present
        if ml_odds:
            home_data = ml_odds.get("home", {})
            away_data = ml_odds.get("away", {})

            history_doc_data = {
                "runTimestamp": run_timestamp_iso,  # ISO-8601 string
                "home": home_data,
                "away": away_data,
            }

            batch.set(ml_history_ref, history_doc_data)
            ops += 1

        # 3) Append to spread_history subcollection if spread odds are present
        if spread_odds:
            line = spread_odds.get("line")
            home_data = spread_odds.get("home", {})
            away_data = spread_odds.get("away", {})

            history_doc_data = {
                "runTimestamp": run_timestamp_iso,  # ISO-8601 string
                "line": line,
                "home": home_data,
                "away": away_data,
            }

            batch.set(spread_history_ref, history_doc_data)
            ops += 1

        # 4) Append to total_history subcollection if total odds are present
        if total_odds:
            line = total_odds.get("line")
            over_data = total_odds.get("over", {})
            under_data = total_odds.get("under", {})

            history_doc_data = {
                "runTimestamp": run_timestamp_iso,  # ISO-8601 string
                "line": line,
                "over": over_data,
                "under": under_data,
            }

            batch.set(total_history_ref, history_doc_data)
            ops += 1

        updated += 1

        # Firestore batch limit is 500 writes; we do 1-4 writes per event (main doc + up to 3 history entries).
        if ops >= 450:
            batch.commit()
            batch = db.batch()
            ops = 0

    if ops > 0:
        batch.commit()

    return updated
