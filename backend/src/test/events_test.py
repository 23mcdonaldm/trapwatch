import os
import sys
from pathlib import Path
import types
import importlib
import unittest

# Ensure backend/src/main is on sys.path so imports like `from enums...` work
BACKEND_SRC_DIR = Path(__file__).resolve().parents[1]
BACKEND_MAIN_DIR = BACKEND_SRC_DIR / "main"
sys.path.insert(0, str(BACKEND_MAIN_DIR))


# Ensure required settings exist before importing backend modules that read env at import time
os.environ.setdefault("gcp_project_id", "test-project")
os.environ.setdefault("odds_api_key", "test-odds-key")
os.environ.setdefault("odds_api_base_url", "https://api.the-odds-api.com/v4")


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class EventsLeagueUrlTests(unittest.IsolatedAsyncioTestCase):
    async def _assert_league_url(self, league_key: str):
        requested_urls: list[str] = []

        class FakeAsyncClient:
            def __init__(self, timeout=20):
                self.timeout = timeout

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def get(self, url: str):
                requested_urls.append(url)
                return _FakeResponse([])

        # Provide a minimal `httpx` module so tests can run even if httpx isn't installed yet.
        sys.modules["httpx"] = types.SimpleNamespace(AsyncClient=FakeAsyncClient)

        # Provide minimal stubs for google-cloud imports so importing repository modules doesn't fail.
        google_mod = types.ModuleType("google")
        google_cloud_mod = types.ModuleType("google.cloud")
        google_cloud_firestore_mod = types.ModuleType("google.cloud.firestore")
        google_cloud_firestore_mod.Client = object  # used only for typing in this codebase
        google_cloud_mod.firestore = google_cloud_firestore_mod
        google_mod.cloud = google_cloud_mod
        sys.modules["google"] = google_mod
        sys.modules["google.cloud"] = google_cloud_mod
        sys.modules["google.cloud.firestore"] = google_cloud_firestore_mod

        # Import/reload inside test so env vars and stubbed httpx are present
        events_service = importlib.import_module("service.events_service")
        importlib.reload(events_service)

        await events_service.fetch_events(league_key)

        self.assertEqual(len(requested_urls), 1)
        expected = f"{os.environ['odds_api_base_url']}/sports/{league_key}/events?apiKey={os.environ['odds_api_key']}"
        self.assertEqual(requested_urls[0], expected)

    async def test_nfl_url(self):
        from enums.league import LeagueKey
        await self._assert_league_url(LeagueKey.NFL.value)

    async def test_ncaaf_url(self):
        from enums.league import LeagueKey
        await self._assert_league_url(LeagueKey.NCAAF.value)

    async def test_nba_url(self):
        from enums.league import LeagueKey
        await self._assert_league_url(LeagueKey.NBA.value)

    async def test_ncaab_url(self):
        from enums.league import LeagueKey
        await self._assert_league_url(LeagueKey.NCAAB.value)

    async def test_mlb_url(self):
        from enums.league import LeagueKey
        await self._assert_league_url(LeagueKey.MLB.value)

    async def test_nhl_url(self):
        from enums.league import LeagueKey
        await self._assert_league_url(LeagueKey.NHL.value)


if __name__ == "__main__":
    unittest.main()


