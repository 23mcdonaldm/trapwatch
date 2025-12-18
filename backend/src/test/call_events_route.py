"""
Call the backend events route for a single league.

Prereq: run the API server separately, e.g. from backend/src/main:
  uvicorn main:app --reload

Then call:
  python call_events_route.py NFL

By default this hits:
  http://127.0.0.1:8000/api/v1/events/{league}
"""

import argparse
import sys
from pathlib import Path


# Allow running as a simple script: add backend/src/main to sys.path so we can reuse the LeagueKey enum
BACKEND_SRC_DIR = Path(__file__).resolve().parents[1]
BACKEND_MAIN_DIR = BACKEND_SRC_DIR / "main"
sys.path.insert(0, str(BACKEND_MAIN_DIR))


def _parse_league_to_value(s: str) -> str:
    """
    Accept either enum name (e.g. NFL) or enum value (e.g. americanfootball_nfl),
    and return the enum VALUE string used by the API route.
    """
    from enums.league import LeagueKey

    s = s.strip()
    if not s:
        raise ValueError("league is required")

    # Try enum name
    try:
        return LeagueKey[s.upper()].value
    except Exception:
        pass

    # Try enum value
    for lk in LeagueKey:
        if lk.value == s:
            return lk.value

    raise ValueError(
        f"Unknown league '{s}'. Try one of: {[k.name for k in LeagueKey if k.name != 'ALL']}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Call /api/events/{league} for one league.")
    parser.add_argument("league", help="NFL/NCAAF/NBA/NCAAB/MLB/NHL or raw value like americanfootball_nfl")
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:8000",
        help="API base URL (default: http://127.0.0.1:8000)",
    )
    args = parser.parse_args()

    league_value = _parse_league_to_value(args.league)
    url = f"{args.base_url.rstrip('/')}/api/v1/events/{league_value}"

    import httpx

    resp = httpx.get(url, timeout=60)
    print(f"GET {url}")
    print(f"status={resp.status_code}")
    try:
        print(resp.json())
    except Exception:
        print(resp.text)

    return 0 if resp.status_code < 400 else 1


if __name__ == "__main__":
    raise SystemExit(main())


