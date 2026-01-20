from __future__ import annotations

import httpx
import re

from config.settings import settings
from enums.league import LeagueKey
from repository.csv_odds_repository import upsert_csv_odds

import pandas as pd



# Map each LeagueKey to the Settings attribute that holds its GID.
LEAGUE_GID_ATTR_MAP: dict[LeagueKey, str] = {
    LeagueKey.NBA: "nba_gid",
    LeagueKey.NCAAB: "ncaab_gid",
    LeagueKey.NCAAF: "ncaaf_gid",
    LeagueKey.NHL: "nhl_gid",
    LeagueKey.NFL: "nfl_gid",
}

def get_spreadsheet_df(base_url: str, gid: str) -> pd.DataFrame:
    url = f"{base_url}output=csv&single=true&gid={gid}"
    df = pd.read_csv(url)
    df.columns = [c.strip() for c in df.columns]
    return df

def slug(s: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "_" for ch in str(s)).strip("_")


def make_doc_id(league: LeagueKey, gametime: str,home_team: str, away_team: str) -> str:
    return f"{league.value}_{gametime}_{home_team}_{away_team}"


async def get_all_odds(dry_run: bool = False) -> tuple[int, int]:
    """
    Fetch events for all leagues in google sheet (gonna check if league in sheet, excluding ALL) and upsert them.
    Returns: (fetched_total, upserted_total)
    """
    fetched_total = 0
    upserted_total = 0

    base_url = settings.google_sheets_base_url
    if not base_url:
        raise ValueError("google sheets base url is not configured in .env")


    events_odds: dict[str, dict] = {}

    for league, gid_attr in LEAGUE_GID_ATTR_MAP.items():
        gid = getattr(settings, gid_attr, None)
        if not gid:
            # Skip leagues that don't have a configured GID
            continue

        df = get_spreadsheet_df(base_url, gid)
        if df is None:
            continue
        for index, row in df.iterrows():
            home_team = row["Matchup"].split(" @ ")[1]
            away_team = row["Matchup"].split(" @ ")[0]
            game_time_et = row["Game Time ET"]
            doc_id = make_doc_id(league, game_time_et, home_team, away_team)
            if not doc_id in events_odds:
                events_odds[doc_id] = {
                    "Moneyline": {},
                    "Spread": {},
                    "Total": {},
                }
            current_odds = events_odds[doc_id]
            
            # Normalize market names (Puck Line is the same as Spread for hockey)
            market = row["Market"]
            if market == "Puck Line":
                market = "Spread"
            
            if home_team in row["Selection"]:
                selection = "Home"
            else:
                selection = "Away"
            if market == "Spread":
                # Split by either + or - to extract the line (e.g., "Indiana -3.5" or "Indiana +3.5")
                # Using regex character class [+\-] to match either + or - (need to escape - in character class)
                parts = re.split(r'[+\-]', row["Selection"], maxsplit=1)
                if len(parts) > 1:
                    # Get the line value (the part after the + or -)
                    line_str = parts[1].strip()
                    line_value = float(line_str)
                    # The line should always be from the home team's perspective:
                    # - Negative if home team is favored
                    # - Positive if away team is favored
                    is_home_selection = selection == "Home"
                    is_negative_in_selection = "-" in row["Selection"]
                    
                    if is_home_selection:
                        # If selection is home team:
                        #   "-" means home team favored -> line is negative
                        #   "+" means home team underdog -> line is positive
                        if is_negative_in_selection:
                            current_odds["Spread"]["Line"] = -line_value
                        else:
                            current_odds["Spread"]["Line"] = line_value
                    else:
                        # If selection is away team:
                        #   "-" means away team favored -> home team underdog -> line is positive
                        #   "+" means away team underdog -> home team favored -> line is negative
                        if is_negative_in_selection:
                            current_odds["Spread"]["Line"] = line_value
                        else:
                            current_odds["Spread"]["Line"] = -line_value
            if market == "Total":
                current_odds["Total"]["Line"] = float(row["Selection"].split(" ")[1])
                if "Over" in row["Selection"]:
                    selection = "Over"
                else:
                    selection = "Under"
            current_odds[market][selection] = {
                # "odds": int(row["Odds"].strip("+")),
                "odds": row["Odds"],
                "handlePct": float(row["Handle %"].strip("%")),
                "betsPct": float(row["Bets %"].strip("%")),
                "diff": float(row["Diff"].strip("%")),
                "flag": row["Flag"] if pd.notna(row["Flag"]) else None,
            }

    # can read in the data before, and then add a write_flag for ml, spread, and total in future
    upserted = upsert_csv_odds(events_odds)

    return (len(events_odds), upserted)




# async def fetch_odds(league_key: str):
#     """
#     Calls Odds API events endpoint.
#     Docs: /v4/sports/{sport}/events?apiKey=...
#     """
#     url = f"{settings.odds_api_base_url}/sports/{league_key}/odds?apiKey={settings.odds_api_key}&regions=us&markets=h2h,spreads&oddsFormat=american"
#     async with httpx.AsyncClient(timeout=20) as client:
#         r = await client.get(url)
#         r.raise_for_status()
#         return r.json()
