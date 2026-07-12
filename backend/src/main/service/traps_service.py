from typing import Optional
from enums.trap_status import TrapStatus, TrapChange, TRAP_RANK
from repository.get_events_repository import get_all_events_with_odds
from repository.firestore import get_db

NT = TrapStatus.NO_TRAP.value


def _empty_result() -> dict:
    return {
        "moneyline": None,
        "moneyline_side": None,
        "moneyline_change": None,
        "spread": None,
        "spread_side": None,
        "spread_change": None,
        "total": None,
        "total_side": None,
        "total_change": None,
        "update": False,
    }


def _grade(result: dict, key: str, prev_status: Optional[str], new_status: str, side: Optional[str]) -> None:
    """
    Fill result[key]* when the tier changed — one symmetric path for upgrades
    AND downgrades (including tier -> NT). A missing/unknown prev counts as
    NO_TRAP so never-flagged games stay quiet instead of rewriting every run.
    """
    prev = prev_status if prev_status in TRAP_RANK else NT
    if new_status == prev:
        return
    result[key] = new_status
    result[f"{key}_side"] = side if new_status != NT else None
    result[f"{key}_change"] = (
        TrapChange.UPGRADE.value if TRAP_RANK[new_status] > TRAP_RANK[prev] else TrapChange.DOWNGRADE.value
    )
    result["update"] = True


def _factor_prev(market_odds: dict, factor: str) -> Optional[str]:
    """Previous tier stored in this detector's own StatusFactors slot (list/tuple of (status, side))."""
    entry = (market_odds.get("StatusFactors") or {}).get(factor)
    if isinstance(entry, (list, tuple)) and entry:
        return entry[0]
    return None


async def detect_trap_status(current_odds: dict) -> dict:
    """
    THE single authority for a market's Status/StatusSide (TC/TD/TP/NT).

    Public side per market: Moneyline = the favorite (by odds); Spread and
    Total = the side with the higher bets%. All gates must pass, then the
    stored diff (handlePct - betsPct, negative when tickets outweigh money)
    sets the tier:

      Gates:  side odds >= -350  AND  side betsPct >= 65
      Tiers:  diff <= -50 -> TC | diff <= -35 -> TD | diff <= -25 -> TP | else NT
    """
    result = _empty_result()

    def tier(odds: float, bets_pct: float, diff: float) -> str:
        if odds < -350 or bets_pct < 65:
            return NT
        if diff <= -50:
            return TrapStatus.TRAP_CITY.value
        if diff <= -35:
            return TrapStatus.TRAP_DETECTED.value
        if diff <= -25:
            return TrapStatus.TRAP_POTENTIAL.value
        return NT

    # MONEYLINE — public side is the favorite
    moneyline = current_odds.get("Moneyline", {})
    if moneyline:
        home_data = moneyline.get("Home") or moneyline.get("home", {})
        away_data = moneyline.get("Away") or moneyline.get("away", {})
        home_odds = home_data.get("odds") or 0
        away_odds = away_data.get("odds") or 0
        side = "Home" if home_odds < away_odds else "Away"
        data = home_data if side == "Home" else away_data
        new_status = tier(data.get("odds") or 0, data.get("betsPct") or 0, data.get("diff") or 0)
        _grade(result, "moneyline", moneyline.get("Status"), new_status, side)

    # SPREAD — public side has the higher bets%
    spread = current_odds.get("Spread", {})
    if spread:
        home_data = spread.get("Home") or spread.get("home", {})
        away_data = spread.get("Away") or spread.get("away", {})
        side = "Home" if (home_data.get("betsPct") or 0) > (away_data.get("betsPct") or 0) else "Away"
        data = home_data if side == "Home" else away_data
        new_status = tier(data.get("odds") or 0, data.get("betsPct") or 0, data.get("diff") or 0)
        _grade(result, "spread", spread.get("Status"), new_status, side)

    # TOTAL — public side has the higher bets%
    total = current_odds.get("Total", {})
    if total:
        over_data = total.get("Over") or total.get("over", {})
        under_data = total.get("Under") or total.get("under", {})
        side = "Over" if (over_data.get("betsPct") or 0) > (under_data.get("betsPct") or 0) else "Under"
        data = over_data if side == "Over" else under_data
        new_status = tier(data.get("odds") or 0, data.get("betsPct") or 0, data.get("diff") or 0)
        _grade(result, "total", total.get("Status"), new_status, side)

    return result


async def detect_trap_diff(current_odds: dict) -> dict:
    """
    Informational handle-vs-bets divergence signal. Feeds ONLY
    StatusFactors.Diff (the frontend trigger pills) — never Status.
    """
    result = _empty_result()

    def tier(sharp_diff: float, tc: float, td: float, tp: float) -> str:
        if sharp_diff > tc:
            return TrapStatus.TRAP_CITY.value
        if sharp_diff > td:
            return TrapStatus.TRAP_DETECTED.value
        if sharp_diff > tp:
            return TrapStatus.TRAP_POTENTIAL.value
        return NT

    for key, market_name, thresholds in (
        ("moneyline", "Moneyline", (40, 30, 20)),
        ("spread", "Spread", (30, 20, 10)),
        ("total", "Total", (30, 20, 10)),
    ):
        market = current_odds.get(market_name, {})
        if not market:
            continue
        home_data = market.get("Home") or market.get("home", {})
        home_handle_pct = home_data.get("handlePct") or 0
        home_bets_pct = home_data.get("betsPct") or 0
        sharp_diff = abs(home_handle_pct - home_bets_pct)
        side = "Home" if home_bets_pct > home_handle_pct else "Away"
        new_status = tier(sharp_diff, *thresholds)
        _grade(result, key, _factor_prev(market, "Diff"), new_status, side)

    return result


async def detect_trap_public_money(current_odds: dict) -> dict:
    """
    Informational public-ticket-overload signal (raw bets% thresholds). Feeds
    ONLY StatusFactors.PublicMoney (the frontend trigger pills) — never Status.
    """
    result = _empty_result()

    def tier(bets_pct: float) -> str:
        if bets_pct > 90:
            return TrapStatus.TRAP_CITY.value
        if bets_pct > 80:
            return TrapStatus.TRAP_DETECTED.value
        if bets_pct > 70:
            return TrapStatus.TRAP_POTENTIAL.value
        return NT

    # MONEYLINE — the favorite's bets%, only when odds >= -300
    moneyline = current_odds.get("Moneyline", {})
    if moneyline:
        home_data = moneyline.get("Home") or moneyline.get("home", {})
        away_data = moneyline.get("Away") or moneyline.get("away", {})
        home_odds = home_data.get("odds") or 0
        away_odds = away_data.get("odds") or 0
        side = "Home" if home_odds < away_odds else "Away"
        data = home_data if side == "Home" else away_data
        favorite_odds = data.get("odds") or 0
        new_status = tier(data.get("betsPct") or 0) if favorite_odds >= -300 else NT
        _grade(result, "moneyline", _factor_prev(moneyline, "PublicMoney"), new_status, side)

    # SPREAD — the higher-bets% side
    spread = current_odds.get("Spread", {})
    if spread:
        home_data = spread.get("Home") or spread.get("home", {})
        away_data = spread.get("Away") or spread.get("away", {})
        side = "Home" if (home_data.get("betsPct") or 0) > (away_data.get("betsPct") or 0) else "Away"
        data = home_data if side == "Home" else away_data
        _grade(result, "spread", _factor_prev(spread, "PublicMoney"), tier(data.get("betsPct") or 0), side)

    # TOTAL — the higher-bets% side
    total = current_odds.get("Total", {})
    if total:
        over_data = total.get("Over") or total.get("over", {})
        under_data = total.get("Under") or total.get("under", {})
        side = "Over" if (over_data.get("betsPct") or 0) > (under_data.get("betsPct") or 0) else "Under"
        data = over_data if side == "Over" else under_data
        _grade(result, "total", _factor_prev(total, "PublicMoney"), tier(data.get("betsPct") or 0), side)

    return result


async def calculate_traps() -> tuple[int, int, int, list[str], list[str], list[str]]:
    """
    Recompute trap state for all games and persist changes.

    detect_trap_status is the ONLY writer of Status/StatusSide (and the source
    of the returned TC/TD/TP counts). detect_trap_diff and
    detect_trap_public_money write only their StatusFactors tuples for the
    frontend trigger pills. Every detector emits explicit NO_TRAP ("NT")
    downgrades, so stale flags self-heal on the first run after the split
    normalizes.

    Status tiers (see detect_trap_status): odds >= -350, bets% >= 65, then
    bets-handle diff >= 25 -> TP, >= 35 -> TD, >= 50 -> TC.

    Returns: (TC_count, TD_count, TP_count, TC_ids, TD_ids, TP_ids) counting
    markets whose Status CHANGED to that tier this run.
    """
    TC_count = 0
    TC_games_ids = []
    TD_count = 0
    TD_games_ids = []
    TP_count = 0
    TP_games_ids = []

    events = get_all_events_with_odds()

    db = get_db()
    batch = db.batch()
    batch_ops = 0

    for event_doc in events:
        if not event_doc.exists:
            continue

        event_data = event_doc.to_dict()
        if not event_data:
            continue

        current_odds = event_data.get("currentOdds", {})
        updated_odds_with_trap_status = current_odds.copy()

        # --- Status (single authority) ---
        status_result = await detect_trap_status(current_odds)
        for key, market_name in (("moneyline", "Moneyline"), ("spread", "Spread"), ("total", "Total")):
            new_status = status_result[key]
            if new_status is None:
                continue
            updated_odds_with_trap_status[market_name]["Status"] = new_status
            updated_odds_with_trap_status[market_name]["StatusSide"] = status_result[f"{key}_side"]
            if new_status == TrapStatus.TRAP_CITY.value:
                TC_count += 1
                TC_games_ids.append(event_doc.id)
            elif new_status == TrapStatus.TRAP_DETECTED.value:
                TD_count += 1
                TD_games_ids.append(event_doc.id)
            elif new_status == TrapStatus.TRAP_POTENTIAL.value:
                TP_count += 1
                TP_games_ids.append(event_doc.id)

        # --- StatusFactors (informational signals for trigger pills) ---
        diff_result = await detect_trap_diff(current_odds)
        public_money_result = await detect_trap_public_money(current_odds)
        for factor, factor_result in (("Diff", diff_result), ("PublicMoney", public_money_result)):
            for key, market_name in (("moneyline", "Moneyline"), ("spread", "Spread"), ("total", "Total")):
                if factor_result[key] is None:
                    continue
                market_odds = updated_odds_with_trap_status[market_name]
                if "StatusFactors" not in market_odds:
                    market_odds["StatusFactors"] = {}
                market_odds["StatusFactors"][factor] = (factor_result[key], factor_result[f"{key}_side"])

        # Update Firestore only when at least one detector saw a change
        if status_result["update"] or diff_result["update"] or public_money_result["update"]:
            event_ref = db.collection("odds").document(event_doc.id)
            batch.update(event_ref, {"currentOdds": updated_odds_with_trap_status})
            batch_ops += 1

            # Firestore batch limit is 500 ops
            if batch_ops >= 450:
                batch.commit()
                batch = db.batch()
                batch_ops = 0

    # Commit remaining updates
    if batch_ops > 0:
        batch.commit()

    return TC_count, TD_count, TP_count, TC_games_ids, TD_games_ids, TP_games_ids
