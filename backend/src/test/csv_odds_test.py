import os
import sys
from pathlib import Path
import types
import importlib
import unittest
from datetime import datetime, timezone

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


class CsvOddsRepositoryTests(unittest.TestCase):
    def test_upsert_csv_odds_writes_main_doc_and_history(self):
        _install_google_firestore_stubs()

        csv_odds_repo = importlib.import_module("repository.csv_odds_repository")
        importlib.reload(csv_odds_repo)

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
        csv_odds_repo.get_db = lambda: fake_db  # noqa: E731

        # Test data matching the expected structure
        updates = {
            "ncaaf_2026-01-01_19:00_alabama_georgia": {
                "Moneyline": {
                    "home": {
                        "odds": -140,
                        "handlePct": 62,
                        "betsPct": 55,
                        "diff": 7,
                        "flag": None,
                    },
                    "away": {
                        "odds": 120,
                        "handlePct": 38,
                        "betsPct": 45,
                        "diff": -7,
                        "flag": None,
                    },
                },
                "Spread": {
                    "line": -3.5,
                    "home": {
                        "odds": -110,
                        "handlePct": 58,
                        "betsPct": 52,
                    },
                    "away": {
                        "odds": -110,
                        "handlePct": 42,
                        "betsPct": 48,
                    },
                },
                "Total": {
                    "line": 51.5,
                    "over": {
                        "odds": -110,
                        "handlePct": 54,
                        "betsPct": 49,
                    },
                    "under": {
                        "odds": -110,
                        "handlePct": 46,
                        "betsPct": 51,
                    },
                },
            }
        }

        updated = csv_odds_repo.upsert_csv_odds(updates)

        self.assertEqual(updated, 1)
        # Should have 4 writes: main doc + ml_history + spread_history + total_history
        self.assertEqual(len(fake_db._batch.set_calls), 4)
        self.assertEqual(fake_db._batch.commit_calls, 1)

        # Check main document write
        main_doc_call = fake_db._batch.set_calls[0]
        self.assertTrue(main_doc_call["merge"])
        main_data = main_doc_call["data"]
        self.assertEqual(main_data["id"], "ncaaf_2026-01-01_19:00_alabama_georgia")
        self.assertEqual(main_data["league"], "ncaaf")
        self.assertEqual(main_data["gameDateET"], "2026-01-01")
        self.assertEqual(main_data["gameTimeET"], "19:00")
        self.assertEqual(main_data["homeTeam"], "alabama")
        self.assertEqual(main_data["awayTeam"], "georgia")
        self.assertIn("currentOdds", main_data)
        self.assertIn("Moneyline", main_data["currentOdds"])
        self.assertIn("Spread", main_data["currentOdds"])
        self.assertIn("Total", main_data["currentOdds"])
        self.assertIsInstance(main_data["lastUpdatedAt"], datetime)

        # Check ML history write
        ml_history_call = fake_db._batch.set_calls[1]
        ml_data = ml_history_call["data"]
        self.assertIn("runTimestamp", ml_data)
        self.assertIn("home", ml_data)
        self.assertIn("away", ml_data)
        self.assertEqual(ml_data["home"]["odds"], -140)
        self.assertEqual(ml_data["away"]["odds"], 120)
        self.assertTrue(ml_data["runTimestamp"].endswith("Z"))  # ISO format

        # Check Spread history write
        spread_history_call = fake_db._batch.set_calls[2]
        spread_data = spread_history_call["data"]
        self.assertIn("runTimestamp", spread_data)
        self.assertIn("line", spread_data)
        self.assertEqual(spread_data["line"], -3.5)
        self.assertIn("home", spread_data)
        self.assertIn("away", spread_data)

        # Check Total history write
        total_history_call = fake_db._batch.set_calls[3]
        total_data = total_history_call["data"]
        self.assertIn("runTimestamp", total_data)
        self.assertIn("line", total_data)
        self.assertEqual(total_data["line"], 51.5)
        self.assertIn("over", total_data)
        self.assertIn("under", total_data)

    def test_upsert_csv_odds_handles_partial_odds(self):
        """Test that it works when only some odds types are present"""
        _install_google_firestore_stubs()

        csv_odds_repo = importlib.import_module("repository.csv_odds_repository")
        importlib.reload(csv_odds_repo)

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
        csv_odds_repo.get_db = lambda: fake_db  # noqa: E731

        # Only ML odds, no spread or total
        updates = {
            "nfl_2026-01-15_20:00_chiefs_bills": {
                "Moneyline": {
                    "home": {"odds": -150, "handlePct": 60, "betsPct": 55, "diff": 5, "flag": None},
                    "away": {"odds": 130, "handlePct": 40, "betsPct": 45, "diff": -5, "flag": None},
                }
            }
        }

        updated = csv_odds_repo.upsert_csv_odds(updates)

        self.assertEqual(updated, 1)
        # Should have 2 writes: main doc + ml_history only
        self.assertEqual(len(fake_db._batch.set_calls), 2)
        self.assertEqual(fake_db._batch.commit_calls, 1)

        # Check main doc only has Moneyline in currentOdds
        main_doc_call = fake_db._batch.set_calls[0]
        main_data = main_doc_call["data"]
        self.assertIn("Moneyline", main_data["currentOdds"])
        self.assertNotIn("Spread", main_data["currentOdds"])
        self.assertNotIn("Total", main_data["currentOdds"])


if __name__ == "__main__":
    unittest.main()
