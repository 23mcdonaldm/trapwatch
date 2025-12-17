from datetime import datetime
import httpx

from config.settings import settings
from enums.league import LeagueKey
from repository.events_repository import upsert_events

def normalize_event(league_key: str, raw: dict) -> dict:
    # Odds API events commonly have: id, commence_time, home_team, away_team
    # Normalize to Firestore-friendly structure.
    return {
        "gameId": raw["id"],
        "leagueKey": league_key,
        "commenceTime": datetime.fromisoformat(raw["commence_time"].replace("Z", "+00:00")),
        "homeTeam": raw["home_team"],
        "awayTeam": raw["away_team"],
    }

async def get_events(league_key: str) -> tuple[int, int]:
    raw_events = await fetch_events(league_key)
    normalized = [normalize_event(league_key, e) for e in raw_events]

    upserted = upsert_events(normalized)
    return (len(raw_events), upserted)

async def get_all_events() -> tuple[int, int]:
    """
    Fetch events for all leagues (excluding ALL) and upsert them.
    Returns: (fetched_total, upserted_total)
    """
    fetched_total = 0
    upserted_total = 0

    for league in LeagueKey:
        if league == LeagueKey.ALL:
            continue
        fetched, upserted = await get_events(league.value)
        fetched_total += fetched
        upserted_total += upserted

    return fetched_total, upserted_total


async def fetch_events(league_key: str):
    """
    Calls Odds API events endpoint.
    Docs: /v4/sports/{sport}/events?apiKey=...
    """
    url = f"{settings.odds_api_base_url}/sports/{league_key}/events?apiKey={settings.odds_api_key}"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()
