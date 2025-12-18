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
    home_spread_price = None
    away_spread = None
    away_spread_price = None
    last_updated_odds = None

    # Be defensive: Odds API payloads can omit bookmakers/markets/outcomes.
    bookmakers = raw.get("bookmakers") or []
    if not bookmakers:
        return None

    bookmaker = None
    for b in bookmakers:
        if (b or {}).get("markets"):
            bookmaker = b
            break
    if not bookmaker:
        return None

    markets = bookmaker.get("markets") or []
    home_team = raw.get("home_team")

    try:
        for market in markets:
            key = (market or {}).get("key")
            outcomes = (market or {}).get("outcomes") or []
            if key not in {"h2h", "spreads"} or len(outcomes) < 2 or not home_team:
                continue

            # Find which outcome corresponds to the home team
            o0, o1 = outcomes[0], outcomes[1]
            if o0.get("name") == home_team:
                home_outcome, away_outcome = o0, o1
            elif o1.get("name") == home_team:
                home_outcome, away_outcome = o1, o0
            else:
                continue

            if key == "h2h":
                home_ml = home_outcome.get("price")
                away_ml = away_outcome.get("price")
            elif key == "spreads":
                home_spread = home_outcome.get("point")
                home_spread_price = home_outcome.get("price")
                away_spread = away_outcome.get("point")
                away_spread_price = away_outcome.get("price")
    except Exception:
        # Never let a single malformed event take down the whole /odds call.
        return None

    # Odds API provides `last_update` as an ISO string; keep it as-is.
    last_updated_odds = bookmaker.get("last_update")
    return {
        "gameId": raw["id"],
        "home_ml": home_ml,
        "away_ml": away_ml,
        "home_spread": home_spread,
        "home_spread_price": home_spread_price,
        "away_spread": away_spread,
        "away_spread_price": away_spread_price,
        "last_updated_odds": last_updated_odds,
        "bookmaker": bookmaker.get("key") or bookmaker.get("title"),
    }

async def get_odds(league_key: str, dry_run: bool = False) -> tuple[int, int]:
    raw_events = await fetch_odds(league_key)
    normalized = [x for x in (extract_odds(e) for e in raw_events) if x is not None]

    # For local/dev usage you may want to fetch without persisting to Firestore (e.g. if
    # credentials aren't available). Caller can choose to skip persistence.
    if dry_run:
        return (len(raw_events), 0)

    upserted = upsert_current_odds(normalized)
    return (len(raw_events), upserted)

async def get_all_odds(dry_run: bool = False) -> tuple[int, int]:
    """
    Fetch events for all leagues (excluding ALL) and upsert them.
    Returns: (fetched_total, upserted_total)
    """
    fetched_total = 0
    upserted_total = 0

    for league in LeagueKey:
        if league == LeagueKey.ALL:
            continue
        fetched, upserted = await get_odds(league.value, dry_run=dry_run)
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
