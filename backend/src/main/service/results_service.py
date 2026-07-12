"""
Grades finished games: user picks (user_picks + users records) and system trap
flags (trap_results + system_records).

Grading rules (Spread Line is stored from the HOME team's perspective):
  - Moneyline: higher final score wins; tie -> push
  - Spread:   homeScore + Line vs awayScore; equal -> push (whole lines only)
  - Total:    homeScore + awayScore vs Line; equal -> push

System rule: a trap flag's StatusSide marks the PUBLIC side — the system WINS
when that side LOSES. Pushes count as pushes on both user and system records.
"""

from datetime import datetime, timezone

from enums.event_status import Market
from repository.user_picks_repository import get_pending_picks_for_market, grade_pick_and_update_record
from repository.trap_results_repository import record_trap_result

TRAP_STATUSES = {"TC", "TD", "TP"}


def winning_side(market: str, market_odds: dict, home_score: int, away_score: int) -> str | None:
    """
    The winning side of a market: "home" | "away" | "over" | "under" | "push".
    Returns None when the market can't be graded (missing line).
    """
    if market == Market.moneyline.value:
        if home_score > away_score:
            return "home"
        if away_score > home_score:
            return "away"
        return "push"

    if market == Market.spread.value:
        line = market_odds.get("Line")
        if line is None:
            return None
        adjusted = home_score + line
        if adjusted > away_score:
            return "home"
        if adjusted < away_score:
            return "away"
        return "push"

    if market == Market.total.value:
        line = market_odds.get("Line")
        if line is None:
            return None
        total = home_score + away_score
        if total > line:
            return "over"
        if total < line:
            return "under"
        return "push"

    return None


def grade_side(side: str, winner: str) -> str:
    """Result for a picked side given the market's winning side."""
    if winner == "push":
        return "push"
    return "win" if side == winner else "loss"


def evaluate_game(game_id: str, event_data: dict) -> dict:
    """
    Grade every market of a completed game: all pending user picks, then the
    system record for any flagged market. Safe to call repeatedly — picks are
    only graded while pending and trap results are only written once.

    Returns a summary: {"picks_graded": int, "traps_recorded": int}
    """
    final_score = event_data.get("finalScore")
    if not final_score:
        return {"picks_graded": 0, "traps_recorded": 0}

    home_score = int(final_score["home"])
    away_score = int(final_score["away"])
    current_odds = event_data.get("currentOdds", {})
    league = event_data.get("league", "")
    evaluatedAt = datetime.now(timezone.utc).isoformat()

    picks_graded = 0
    traps_recorded = 0

    for market in [Market.moneyline.value, Market.spread.value, Market.total.value]:
        market_odds = current_odds.get(market) or {}
        winner = winning_side(market, market_odds, home_score, away_score)
        if winner is None:
            continue

        # --- User picks (stored with lowercase market) ---
        for pick_snap in get_pending_picks_for_market(game_id, market.lower()):
            result = grade_side(pick_snap.get("side"), winner)
            grade_pick_and_update_record(pick_snap, result, evaluatedAt)
            picks_graded += 1

        # --- System record for flagged markets ---
        status = market_odds.get("Status")
        status_side = market_odds.get("StatusSide")
        if status in TRAP_STATUSES and status_side:
            public_result = grade_side(status_side.lower(), winner)
            # System wins when the public (trap) side loses.
            outcome = {"win": "loss", "loss": "win", "push": "push"}[public_result]
            recorded = record_trap_result(
                opportunity_id=f"{game_id}_{market.lower()}",
                game_id=game_id,
                league=league,
                market=market,
                status=status,
                status_side=status_side.lower(),
                outcome=outcome,
                final_score={"home": home_score, "away": away_score},
                evaluatedAt=evaluatedAt,
            )
            if recorded:
                traps_recorded += 1

    return {"picks_graded": picks_graded, "traps_recorded": traps_recorded}
