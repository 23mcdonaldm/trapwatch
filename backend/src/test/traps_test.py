import asyncio
import os
import sys
from pathlib import Path
import unittest

# Ensure backend/src/main is on sys.path so imports like `from enums...` work
BACKEND_SRC_DIR = Path(__file__).resolve().parents[1]
BACKEND_MAIN_DIR = BACKEND_SRC_DIR / "main"
sys.path.insert(0, str(BACKEND_MAIN_DIR))

# Ensure required settings exist before importing backend modules that read env at import time
os.environ.setdefault("gcp_project_id", "test-project")
os.environ.setdefault("odds_api_key", "test-odds-key")
os.environ.setdefault("odds_api_base_url", "https://api.the-odds-api.com/v4")
os.environ.setdefault("google_sheets_base_url", "https://example.com")

from service.traps_service import detect_trap_status, detect_trap_diff, detect_trap_public_money  # noqa: E402


def run(coro):
    return asyncio.run(coro)


def ml_odds(fav_odds=-110, bets=70, diff=-30, status=None):
    """Moneyline with Home as the favorite; diff is handlePct - betsPct on Home."""
    market = {
        "Home": {"odds": fav_odds, "betsPct": bets, "handlePct": bets + diff, "diff": diff},
        "Away": {"odds": abs(fav_odds) + 20, "betsPct": 100 - bets, "handlePct": 100 - (bets + diff), "diff": -diff},
    }
    if status is not None:
        market["Status"] = status
    return {"Moneyline": market}


class DetectTrapStatusTierTests(unittest.TestCase):
    # Tiers: diff <= -50 TC | <= -35 TD | <= -25 TP | else NT

    def test_tp_at_minus_25(self):
        r = run(detect_trap_status(ml_odds(diff=-25)))
        self.assertEqual(r["moneyline"], "TP")
        self.assertEqual(r["moneyline_side"], "Home")
        self.assertEqual(r["moneyline_change"], "upgrade")
        self.assertTrue(r["update"])

    def test_td_at_minus_35(self):
        r = run(detect_trap_status(ml_odds(diff=-35)))
        self.assertEqual(r["moneyline"], "TD")

    def test_tc_at_minus_50(self):
        r = run(detect_trap_status(ml_odds(diff=-50)))
        self.assertEqual(r["moneyline"], "TC")

    def test_below_threshold_never_flagged_stays_quiet(self):
        # diff -24 -> NT, no prior Status -> nothing to write
        r = run(detect_trap_status(ml_odds(diff=-24)))
        self.assertIsNone(r["moneyline"])
        self.assertFalse(r["update"])


class DetectTrapStatusGateTests(unittest.TestCase):
    def test_heavy_favorite_gated_out(self):
        # -400 favorite fails the odds gate even with a monster diff
        r = run(detect_trap_status(ml_odds(fav_odds=-400, diff=-60)))
        self.assertIsNone(r["moneyline"])
        self.assertFalse(r["update"])

    def test_minus_350_passes_odds_gate(self):
        r = run(detect_trap_status(ml_odds(fav_odds=-350, diff=-60)))
        self.assertEqual(r["moneyline"], "TC")

    def test_low_bets_pct_gated_out(self):
        r = run(detect_trap_status(ml_odds(bets=64, diff=-60)))
        self.assertIsNone(r["moneyline"])

    def test_bets_65_passes_gate(self):
        r = run(detect_trap_status(ml_odds(bets=65, diff=-60)))
        self.assertEqual(r["moneyline"], "TC")


class DetectTrapStatusDowngradeTests(unittest.TestCase):
    def test_stale_tc_downgrades_to_nt(self):
        # Was TC, split has normalized -> explicit NT write with side cleared
        r = run(detect_trap_status(ml_odds(diff=0, status="TC")))
        self.assertEqual(r["moneyline"], "NT")
        self.assertIsNone(r["moneyline_side"])
        self.assertEqual(r["moneyline_change"], "downgrade")
        self.assertTrue(r["update"])

    def test_tc_downgrades_to_tp(self):
        r = run(detect_trap_status(ml_odds(diff=-26, status="TC")))
        self.assertEqual(r["moneyline"], "TP")
        self.assertEqual(r["moneyline_change"], "downgrade")

    def test_unchanged_tier_is_a_noop(self):
        r = run(detect_trap_status(ml_odds(diff=-40, status="TD")))
        self.assertIsNone(r["moneyline"])
        self.assertFalse(r["update"])

    def test_nt_to_nt_is_a_noop(self):
        r = run(detect_trap_status(ml_odds(diff=0, status="NT")))
        self.assertFalse(r["update"])


class DetectTrapStatusSpreadTotalTests(unittest.TestCase):
    def test_spread_public_side_by_bets_pct(self):
        odds = {"Spread": {
            "Home": {"odds": -110, "betsPct": 80, "handlePct": 20, "diff": -60},
            "Away": {"odds": -110, "betsPct": 20, "handlePct": 80, "diff": 60},
        }}
        r = run(detect_trap_status(odds))
        self.assertEqual(r["spread"], "TC")
        self.assertEqual(r["spread_side"], "Home")

    def test_total_under_side(self):
        odds = {"Total": {
            "Over": {"odds": -110, "betsPct": 25, "handlePct": 75, "diff": 50},
            "Under": {"odds": -110, "betsPct": 75, "handlePct": 35, "diff": -40},
        }}
        r = run(detect_trap_status(odds))
        self.assertEqual(r["total"], "TD")
        self.assertEqual(r["total_side"], "Under")


class InformationalDetectorsTests(unittest.TestCase):
    # Both feed StatusFactors only; prev comes from their own factor slot.

    def test_diff_downgrades_own_factor_to_nt(self):
        odds = {"Moneyline": {
            "Home": {"odds": -110, "betsPct": 50, "handlePct": 50},
            "Away": {"odds": -110, "betsPct": 50, "handlePct": 50},
            "StatusFactors": {"Diff": ["TC", "Home"]},
        }}
        r = run(detect_trap_diff(odds))
        self.assertEqual(r["moneyline"], "NT")
        self.assertTrue(r["update"])

    def test_public_money_prev_from_own_slot_not_status(self):
        # Status says TC (set by the authority) but PublicMoney factor was never
        # written -> prev is NT, and 85% bets is a TD upgrade for this factor.
        odds = {"Moneyline": {
            "Home": {"odds": -110, "betsPct": 85, "handlePct": 60},
            "Away": {"odds": 100, "betsPct": 15, "handlePct": 40},
            "Status": "TC",
        }}
        r = run(detect_trap_public_money(odds))
        self.assertEqual(r["moneyline"], "TD")
        self.assertEqual(r["moneyline_change"], "upgrade")


if __name__ == "__main__":
    unittest.main()
