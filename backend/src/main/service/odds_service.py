import httpx

from config.settings import settings
from enums.league import LeagueKey
from repository.odds_repository import upsert_current_odds

def extract_odds(raw: dict) -> dict | None:
    """
    Pick the first bookmaker that has the requested market and return a simple normalized structure.
    """
    home_ml = None
    away_ml = None
    home_spread = None
    away_spread = None
    last_updated_odds = None

    bookmaker = raw["bookmakers"][0] or []
    for market in bookmaker["markets"] or []:
        if market["key"] == "h2h":
            if market["outcomes"][0]["name"] == raw["home_team"]:
                home_ml = market["outcomes"][0]["price"]
                away_ml = market["outcomes"][1]["price"]
            elif market["outcomes"][1]["name"] == raw["home_team"]:
                home_ml = market["outcomes"][1]["price"]
                away_ml = market["outcomes"][0]["price"]
            else:
                raise ValueError(f"Home team not found in h2h market: {raw['home_team']}")
            
        elif market["key"] == "spreads":
            if market["outcomes"][0]["name"] == raw["home_team"]:
                home_spread = market["outcomes"][0]["point"]
                home_spread_price = market["outcomes"][0]["price"]
                away_spread = market["outcomes"][1]["point"]
                away_spread_price = market["outcomes"][1]["price"]
            elif market["outcomes"][1]["name"] == raw["home_team"]:
                home_spread = market["outcomes"][1]["point"]
                home_spread_price = market["outcomes"][1]["price"]
                away_spread = market["outcomes"][0]["point"]
                away_spread_price = market["outcomes"][0]["price"]
            else:
                raise ValueError(f"Home team not found in spreads market: {raw['home_team']}")
    last_updated_odds = bookmaker["last_update"]
    return {
        "gameId": raw["id"],
        "home_ml": home_ml,
        "away_ml": away_ml,
        "home_spread": home_spread,
        "home_spread_price": home_spread_price,
        "away_spread": away_spread,
        "away_spread_price": away_spread_price,
        "last_updated_odds": last_updated_odds,
        "bookmaker": bookmaker["key"] or bookmaker["title"],
    }

async def get_odds(league_key: str) -> tuple[int, int]:
    raw_events = await fetch_odds(league_key)
    normalized = [extract_odds(e) for e in raw_events]

    upserted = upsert_current_odds(normalized)
    return (len(raw_events), upserted)

async def get_all_odds() -> tuple[int, int]:
    """
    Fetch events for all leagues (excluding ALL) and upsert them.
    Returns: (fetched_total, upserted_total)
    """
    fetched_total = 0
    upserted_total = 0

    for league in LeagueKey:
        if league == LeagueKey.ALL:
            continue
        fetched, upserted = await get_odds(league.value)
        fetched_total += fetched
        upserted_total += upserted

    return fetched_total, upserted_total


async def fetch_odds(league_key: str):
    """
    Calls Odds API events endpoint.
    Docs: /v4/sports/{sport}/events?apiKey=...
    """
    url = f"{settings.odds_api_base_url}/sports/{league_key}/odds?apiKey={settings.odds_api_key}&regions=us&markets=h2h,spreads&oddsFormat=american"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()
