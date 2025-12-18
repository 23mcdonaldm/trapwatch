import argparse
import asyncio
import sys
from pathlib import Path


# Allow running as a simple script without packaging: add backend/src/main to sys.path
BACKEND_SRC_DIR = Path(__file__).resolve().parents[1]
BACKEND_MAIN_DIR = BACKEND_SRC_DIR / "main"
sys.path.insert(0, str(BACKEND_MAIN_DIR))


def _parse_league(s: str):
    """
    Accept either enum name (e.g. NFL) or enum value (e.g. americanfootball_nfl).
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

    raise ValueError(f"Unknown league '{s}'. Try one of: {[k.name for k in LeagueKey if k.name != 'ALL']}")


async def main():
    parser = argparse.ArgumentParser(description="Fetch Odds API events for one league.")
    parser.add_argument(
        "league",
        help="League enum name (NFL/NCAAF/NBA/NCAAB/MLB/NHL) or raw value (e.g. americanfootball_nfl)",
    )
    args = parser.parse_args()

    league_key = _parse_league(args.league)

    # Load config (this will read backend/.env if present)
    from config.settings import settings
    # Trigger validation early with a clear error if missing
    _ = settings.odds_api_key
    _ = settings.gcp_project_id

    from service import events_service

    events = await events_service.fetch_events(league_key)
    print(f"league={league_key} events={len(events)}")


if __name__ == "__main__":
    asyncio.run(main())


