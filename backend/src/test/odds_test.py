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
os.environ.setdefault("google_sheets_base_url", "https://docs.google.com/spreadsheets/d")


def _install_google_firestore_stubs():
    """
    Provide minimal stubs for google-cloud imports so importing repository modules doesn't fail.
    Mirrors the approach used in events_test.py.
    """
    google_mod = types.ModuleType("google")
    google_cloud_mod = types.ModuleType("google.cloud")
    google_cloud_firestore_mod = types.ModuleType("google.cloud.firestore")
    google_cloud_firestore_mod.Client = object  # used only for typing in this codebase
    google_cloud_mod.firestore = google_cloud_firestore_mod
    google_mod.cloud = google_cloud_mod
    sys.modules["google"] = google_mod
    sys.modules["google.cloud"] = google_cloud_mod
    sys.modules["google.cloud.firestore"] = google_cloud_firestore_mod


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class OddsLeagueUrlTests(unittest.IsolatedAsyncioTestCase):
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

        # Patch only `httpx.AsyncClient` (do NOT replace the whole httpx module, since
        # FastAPI/Starlette's TestClient relies on many other httpx symbols).
        import httpx
        orig_async_client = httpx.AsyncClient
        httpx.AsyncClient = FakeAsyncClient
        _install_google_firestore_stubs()

        try:
            odds_service = importlib.import_module("service.odds_service")
            importlib.reload(odds_service)

            await odds_service.fetch_odds(league_key)
        finally:
            httpx.AsyncClient = orig_async_client

        self.assertEqual(len(requested_urls), 1)
        expected = (
            f"{os.environ['odds_api_base_url']}/sports/{league_key}/odds"
            f"?apiKey={os.environ['odds_api_key']}&regions=us&markets=h2h,spreads&oddsFormat=american"
        )
        self.assertEqual(requested_urls[0], expected)

    async def test_nfl_url(self):
        from enums.league import LeagueKey

        await self._assert_league_url(LeagueKey.NFL.value)


class OddsApiRouteTests(unittest.TestCase):
    def test_get_odds_by_league_accepts_name_and_value(self):
        _install_google_firestore_stubs()

        # Reload router/service modules in case earlier tests replaced sys.modules entries.
        odds_service = importlib.import_module("service.odds_service")

        async def fake_get_odds(league_key: str, dry_run: bool = False):
            # API route should pass the internal LeagueKey value (no underscore)
            self.assertEqual(league_key, "americanfootballnfl")
            self.assertFalse(dry_run)
            return (3, 2)

        odds_service.get_odds = fake_get_odds

        main_mod = importlib.import_module("main")
        importlib.reload(main_mod)
        app = main_mod.create_app()

        from fastapi.testclient import TestClient

        client = TestClient(app)

        # Enum NAME (NFL)
        r1 = client.get("/api/v1/odds/NFL")
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(
            r1.json(),
            {"leagueKey": "americanfootballnfl", "fetchedCount": 3, "upsertedCount": 2},
        )

        # Enum VALUE (internal LeagueKey value, no underscore)
        r2 = client.get("/api/v1/odds/americanfootballnfl")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(
            r2.json(),
            {"leagueKey": "americanfootballnfl", "fetchedCount": 3, "upsertedCount": 2},
        )

    def test_get_odds_by_league_rejects_unknown_league(self):
        _install_google_firestore_stubs()

        # We don't want to call the service in this test at all; unknown league should fail earlier.
        main_mod = importlib.import_module("main")
        importlib.reload(main_mod)
        app = main_mod.create_app()

        from fastapi.testclient import TestClient

        client = TestClient(app)
        r = client.get("/api/v1/odds/not-a-real-league")
        self.assertEqual(r.status_code, 422)
        self.assertIn("Unknown league", r.json()["detail"])

    def test_get_odds_all_uses_all_key(self):
        _install_google_firestore_stubs()

        odds_service = importlib.import_module("service.odds_service")

        async def fake_get_all_odds(dry_run: bool = False):
            self.assertFalse(dry_run)
            return (10, 7)

        odds_service.get_all_odds = fake_get_all_odds

        main_mod = importlib.import_module("main")
        importlib.reload(main_mod)
        app = main_mod.create_app()

        from fastapi.testclient import TestClient

        client = TestClient(app)
        r = client.get("/api/v1/odds")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"leagueKey": "all", "fetchedCount": 10, "upsertedCount": 7})

    def test_get_odds_all_dry_run_skips_persist(self):
        _install_google_firestore_stubs()

        odds_service = importlib.import_module("service.odds_service")

        async def fake_get_all_odds(dry_run: bool = False):
            self.assertTrue(dry_run)
            return (10, 0)

        odds_service.get_all_odds = fake_get_all_odds

        main_mod = importlib.import_module("main")
        importlib.reload(main_mod)
        app = main_mod.create_app()

        from fastapi.testclient import TestClient

        client = TestClient(app)
        r = client.get("/api/v1/odds?dry_run=1")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"leagueKey": "all", "fetchedCount": 10, "upsertedCount": 0})


class OddsRepositoryTests(unittest.TestCase):
    def test_upsert_current_odds_writes_bookmaker_field(self):
        _install_google_firestore_stubs()

        odds_repo = importlib.import_module("repository.odds_repository")
        importlib.reload(odds_repo)

        class FakeBatch:
            def __init__(self):
                self.set_calls = []
                self.commit_calls = 0

            def set(self, ref, data, merge=False):
                self.set_calls.append({"ref": ref, "data": data, "merge": merge})

            def commit(self):
                self.commit_calls += 1

        class FakeDocRef:
            def __init__(self, path: str):
                self.path = path

            def collection(self, name: str):
                return FakeCollectionRef(f"{self.path}/{name}")

        class FakeCollectionRef:
            def __init__(self, path: str):
                self.path = path

            def document(self, doc_id: str | None = None):
                # Firestore allows auto-id if doc_id is omitted
                doc_id = doc_id or "auto-id"
                return FakeDocRef(f"{self.path}/{doc_id}")

        class FakeDB:
            def __init__(self):
                self._batch = FakeBatch()

            def batch(self):
                return self._batch

            def collection(self, name: str):
                return FakeCollectionRef(name)

        fake_db = FakeDB()

        # Patch the module's get_db to return our fake db
        odds_repo.get_db = lambda: fake_db  # noqa: E731

        updated = odds_repo.upsert_current_odds(
            [
                {
                    "gameId": "game-1",
                    "home_ml": -110,
                    "away_ml": +100,
                    "home_spread": -1.5,
                    "home_spread_price": -105,
                    "away_spread": +1.5,
                    "away_spread_price": -115,
                    "last_updated_odds": "2025-12-18T00:00:00Z",
                    "bookmaker": "draftkings",
                }
            ]
        )

        self.assertEqual(updated, 1)
        # 2 writes per update (event doc + history doc)
        self.assertEqual(len(fake_db._batch.set_calls), 2)
        for call in fake_db._batch.set_calls:
            self.assertIn("bookmaker", call["data"])
            self.assertEqual(call["data"]["bookmaker"], "draftkings")

    def test_upsert_current_odds_defaults_odds_updated_at_to_iso_z(self):
        _install_google_firestore_stubs()

        odds_repo = importlib.import_module("repository.odds_repository")
        importlib.reload(odds_repo)

        class FakeBatch:
            def __init__(self):
                self.set_calls = []

            def set(self, ref, data, merge=False):
                self.set_calls.append({"ref": ref, "data": data, "merge": merge})

            def commit(self):
                return None

        class FakeDocRef:
            def __init__(self, path: str):
                self.path = path

            def collection(self, name: str):
                return FakeCollectionRef(f"{self.path}/{name}")

        class FakeCollectionRef:
            def __init__(self, path: str):
                self.path = path

            def document(self, doc_id: str | None = None):
                doc_id = doc_id or "auto-id"
                return FakeDocRef(f"{self.path}/{doc_id}")

        class FakeDB:
            def __init__(self):
                self._batch = FakeBatch()

            def batch(self):
                return self._batch

            def collection(self, name: str):
                return FakeCollectionRef(name)

        fake_db = FakeDB()
        odds_repo.get_db = lambda: fake_db  # noqa: E731

        odds_repo.upsert_current_odds(
            [
                {
                    "gameId": "game-1",
                    "home_ml": -110,
                    "away_ml": 100,
                    # last_updated_odds omitted on purpose
                    "bookmaker": "draftkings",
                }
            ]
        )

        self.assertGreaterEqual(len(fake_db._batch.set_calls), 2)
        for call in fake_db._batch.set_calls:
            ts = call["data"]["oddsUpdatedAt"]
            self.assertIsInstance(ts, str)
            self.assertTrue(ts.endswith("Z"))


class OddsServiceExtractTests(unittest.TestCase):
    def test_extract_odds_missing_spreads_does_not_crash(self):
        _install_google_firestore_stubs()

        odds_service = importlib.import_module("service.odds_service")
        importlib.reload(odds_service)

        raw = {
            "id": "game-1",
            "home_team": "Home",
            "away_team": "Away",
            "bookmakers": [
                {
                    "key": "draftkings",
                    "title": "DraftKings",
                    "last_update": "2025-12-18T00:00:00Z",
                    "markets": [
                        {
                            "key": "h2h",
                            "outcomes": [
                                {"name": "Home", "price": -110},
                                {"name": "Away", "price": 100},
                            ],
                        }
                        # spreads omitted
                    ],
                }
            ],
        }

        extracted = odds_service.extract_odds(raw)
        self.assertIsNotNone(extracted)
        self.assertEqual(extracted["gameId"], "game-1")
        self.assertEqual(extracted["home_ml"], -110)
        self.assertEqual(extracted["away_ml"], 100)
        self.assertIsNone(extracted["home_spread"])
        self.assertIsNone(extracted["home_spread_price"])
        self.assertIsNone(extracted["away_spread"])
        self.assertIsNone(extracted["away_spread_price"])

    def test_extract_odds_missing_bookmakers_returns_none(self):
        _install_google_firestore_stubs()

        odds_service = importlib.import_module("service.odds_service")
        importlib.reload(odds_service)

        raw = {"id": "game-1", "home_team": "Home", "away_team": "Away", "bookmakers": []}
        self.assertIsNone(odds_service.extract_odds(raw))


if __name__ == "__main__":
    unittest.main()


