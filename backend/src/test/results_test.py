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

from service.results_service import winning_side, grade_side  # noqa: E402


class WinningSideMoneylineTests(unittest.TestCase):
    def test_home_wins(self):
        self.assertEqual(winning_side("Moneyline", {}, 5, 3), "home")

    def test_away_wins(self):
        self.assertEqual(winning_side("Moneyline", {}, 2, 7), "away")

    def test_tie_is_push(self):
        self.assertEqual(winning_side("Moneyline", {}, 3, 3), "push")


class WinningSideSpreadTests(unittest.TestCase):
    # Line is from the HOME team's perspective.

    def test_home_underdog_covers_with_positive_line(self):
        # Home +1.5, loses 4-5 but covers: 4 + 1.5 = 5.5 > 5
        self.assertEqual(winning_side("Spread", {"Line": 1.5}, 4, 5), "home")

    def test_home_favorite_covers_with_negative_line(self):
        # Home -3.5, wins 7-3: 7 - 3.5 = 3.5 > 3
        self.assertEqual(winning_side("Spread", {"Line": -3.5}, 7, 3), "home")

    def test_away_covers_when_home_favorite_wins_small(self):
        # Home -7, wins by only 3: 10 - 7 = 3 < 7... away covers
        self.assertEqual(winning_side("Spread", {"Line": -7}, 10, 7), "away")

    def test_whole_line_lands_exactly_is_push(self):
        # Home -3, wins by exactly 3
        self.assertEqual(winning_side("Spread", {"Line": -3}, 6, 3), "push")

    def test_half_line_never_pushes(self):
        # Every margin vs a .5 line resolves to a side
        for home, away in [(4, 5), (5, 4), (6, 4), (4, 6)]:
            self.assertIn(winning_side("Spread", {"Line": 1.5}, home, away), ("home", "away"))

    def test_missing_line_is_ungradable(self):
        self.assertIsNone(winning_side("Spread", {}, 4, 2))


class WinningSideTotalTests(unittest.TestCase):
    def test_over_hits(self):
        self.assertEqual(winning_side("Total", {"Line": 8.5}, 5, 4), "over")

    def test_under_hits(self):
        self.assertEqual(winning_side("Total", {"Line": 8.5}, 5, 3), "under")

    def test_whole_line_lands_exactly_is_push(self):
        self.assertEqual(winning_side("Total", {"Line": 9}, 5, 4), "push")

    def test_missing_line_is_ungradable(self):
        self.assertIsNone(winning_side("Total", {}, 5, 4))


class GradeSideTests(unittest.TestCase):
    def test_pick_on_winner_is_win(self):
        self.assertEqual(grade_side("home", "home"), "win")

    def test_pick_on_loser_is_loss(self):
        self.assertEqual(grade_side("away", "home"), "loss")

    def test_push_is_push_for_both_sides(self):
        self.assertEqual(grade_side("over", "push"), "push")
        self.assertEqual(grade_side("under", "push"), "push")


class SystemInversionTests(unittest.TestCase):
    # System wins when the public (StatusSide) side LOSES.
    INVERT = {"win": "loss", "loss": "win", "push": "push"}

    def test_public_side_wins_means_system_loss(self):
        public_result = grade_side("over", "over")
        self.assertEqual(self.INVERT[public_result], "loss")

    def test_public_side_loses_means_system_win(self):
        public_result = grade_side("over", "under")
        self.assertEqual(self.INVERT[public_result], "win")

    def test_push_stays_push(self):
        public_result = grade_side("home", "push")
        self.assertEqual(self.INVERT[public_result], "push")


if __name__ == "__main__":
    unittest.main()
