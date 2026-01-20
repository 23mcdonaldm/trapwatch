import os
import sys
from pathlib import Path
import unittest
import importlib

from datetime import datetime, timezone

# Ensure backend/src/main is on sys.path so imports like `from enums...` work
BACKEND_SRC_DIR = Path(__file__).resolve().parents[1]
BACKEND_MAIN_DIR = BACKEND_SRC_DIR / "main"
sys.path.insert(0, str(BACKEND_MAIN_DIR))

# Ensure required settings exist before importing backend modules that read env at import time
os.environ.setdefault("gcp_project_id", "test-project")
os.environ.setdefault("odds_api_key", "test-odds-key")
os.environ.setdefault("odds_api_base_url", "https://api.the-odds-api.com/v4")


class _FakeDoc:
    def __init__(self, data: dict):
        self._data = data

    def to_dict(self):
        return self._data


class GetEventsRepositoryDateBoundsTests(unittest.TestCase):
    def test_get_events_uses_start_and_end_of_day_bounds(self):
        # Import inside test so we can patch module attributes safely
        get_events_repo = importlib.import_module("repository.get_events_repository")
        importlib.reload(get_events_repo)

        captured_wheres: list[tuple[str, str, object]] = []

        class _FakeQuery:
            def where(self, field, op, value):
                captured_wheres.append((field, op, value))
                return self

            def get(self):
                return []

        class _FakeDB:
            def collection(self, _name):
                return _FakeQuery()

        # Patch get_db used by this module
        get_events_repo.get_db = lambda: _FakeDB()

        date_et = "2026-01-20T15:30:00-05:00"
        get_events_repo.get_events(date_et)

        self.assertEqual(len(captured_wheres), 2)
        self.assertEqual(captured_wheres[0][0], "commenceTime")
        self.assertEqual(captured_wheres[0][1], ">=")
        self.assertEqual(captured_wheres[1][0], "commenceTime")
        self.assertEqual(captured_wheres[1][1], "<")

        start = captured_wheres[0][2]
        end = captured_wheres[1][2]
        self.assertIsInstance(start, datetime)
        self.assertIsInstance(end, datetime)
        # Same tz as the input offset; start at midnight; end is next midnight
        self.assertEqual(start.isoformat(), "2026-01-20T00:00:00-05:00")
        self.assertEqual(end.isoformat(), "2026-01-21T00:00:00-05:00")


class FeedBucketingUnitTests(unittest.IsolatedAsyncioTestCase):
    async def test_feed_service_buckets_by_league_and_trap_status(self):
        feed_service = importlib.import_module("service.feed_service")
        importlib.reload(feed_service)

        # Two valid league events + one invalid league (skipped)
        e1 = _FakeDoc(
            {
                "id": "americanfootballnfl_2026-01-20T01:00:00Z_a_b",
                "league": "americanfootballnfl",
                "currentOdds": {"Moneyline": {"Status": "TC"}},
            }
        )
        e2 = _FakeDoc(
            {
                "id": "basketballnba_2026-01-20T02:00:00Z_c_d",
                "league": "basketballnba",
                "currentOdds": {"Spread": {"Status": "TD"}, "Total": {"Status": "TP"}},
            }
        )
        e3 = _FakeDoc({"id": "bad_1", "league": "not-a-real-league", "currentOdds": {"Moneyline": {"Status": "TC"}}})

        async def _fake_get_events(_date_et: str):
            return [e1, e2, e3]

        # Patch repository call
        feed_service.get_events_repository.get_events = _fake_get_events

        traps, by_league = await feed_service.get_feed_events("2026-01-20T12:00:00-05:00")

        # League buckets
        self.assertEqual(len(by_league["americanfootballnfl"]), 1)
        self.assertEqual(len(by_league["basketballnba"]), 1)

        # Trap buckets (note e2 appears in TD and TP because it has two markets with different statuses)
        self.assertEqual(len(traps["TC"]), 1)
        self.assertEqual(len(traps["TD"]), 1)
        self.assertEqual(len(traps["TP"]), 1)


class FeedRouteApiTests(unittest.TestCase):
    def test_feed_route_returns_bucketed_payload(self):
        # Import app factory
        main_mod = importlib.import_module("main")
        importlib.reload(main_mod)
        app = main_mod.create_app()

        # Patch feed_service used by the route module
        feed_routes = importlib.import_module("api.v1.routes.feed")
        importlib.reload(feed_routes)

        e1 = _FakeDoc(
            {
                "id": "americanfootballnfl_2026-01-20T01:00:00Z_a_b",
                "league": "americanfootballnfl",
                "currentOdds": {"Moneyline": {"Status": "TC"}},
            }
        )

        async def _fake_get_feed_events(_date_et: str):
            # Minimal but representative shape
            traps = {"TC": [e1.to_dict()], "TD": [], "TP": []}
            by_league = {
                "americanfootballnfl": [e1.to_dict()],
                "americanfootballncaaf": [],
                "basketballnba": [],
                "basketballncaab": [],
                "baseballmlb": [],
                "icehockeynhl": [],
            }
            return traps, by_league

        feed_routes.feed_service.get_feed_events = _fake_get_feed_events

        from fastapi.testclient import TestClient

        client = TestClient(app)
        resp = client.get("/api/v1/feed")
        self.assertEqual(resp.status_code, 200)

        payload = resp.json()
        self.assertIn("generatedAt", payload)
        self.assertIn("dateET", payload)
        self.assertIn("traps", payload)
        self.assertIn("by_league", payload)

        self.assertEqual(len(payload["traps"]["TC"]), 1)
        self.assertEqual(len(payload["by_league"]["americanfootballnfl"]), 1)


if __name__ == "__main__":
    unittest.main()

