from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from pathlib import Path

# Prefer loading backend/.env regardless of current working directory.
# This makes `python src/test/run_one_league.py ...` work from any folder.
_BACKEND_DIR = Path(__file__).resolve().parents[3]  # backend/
_ENV_FILE = _BACKEND_DIR / ".env"
_USE_ENV_FILE = _ENV_FILE.exists() and os.access(str(_ENV_FILE), os.R_OK)

class Settings(BaseSettings):
    # Only load from .env if it exists and is readable. This keeps local dev easy,
    # but avoids hard failures in environments where .env is absent or not readable.
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE) if _USE_ENV_FILE else None, extra="ignore")

    # Google Cloud / Firestore
    gcp_project_id: str

    # Odds API
    odds_api_key: str
    odds_api_base_url: str = "https://api.the-odds-api.com/v4"

    # Google Sheets (for CSV odds import) - must be provided via env (no hardcoded default)
    google_sheets_base_url: str
    nfl_gid: str | None = None
    ncaaf_gid: str | None = None
    nba_gid: str | None = None
    ncaab_gid: str | None = None
    mlb_gid: str | None = None
    nhl_gid: str | None = None

    # Security for scheduler-triggered endpoints
    scheduler_secret: str = ""

settings = Settings()
