from typing import Optional
from enums.trap_status import TrapStatus, TrapChange
from repository.get_events_repository import get_all_events_with_odds
from repository.firestore import get_db


async def detect_trap_diff(current_odds: dict) -> dict:
    """
    Detect trap diff for a given event, tracks upgrade or downgrade for future alerts
    """
    moneyline = current_odds.get("Moneyline", {})
    spread = current_odds.get("Spread", {})
    total = current_odds.get("Total", {})


    result = {
        "moneyline": None,
        "moneyline_change": None,
        "spread": None,
        "spread_change": None,
        "total": None,
        "total_change": None,
        "update": False,
    }
    

    # MONEYLINE 
    # Skip if no Moneyline data
    if moneyline:
        # Extract diff values from home and away (case-insensitive check)
        home_data = moneyline.get("Home") or moneyline.get("home", {})
        away_data = moneyline.get("Away") or moneyline.get("away", {})
        # Get diff values, handle None/empty cases
        home_diff_raw = home_data.get("diff") if isinstance(home_data, dict) else None
        away_diff_raw = away_data.get("diff") if isinstance(away_data, dict) else None
        
        home_diff = abs(float(home_diff_raw)) if home_diff_raw is not None else 0
        away_diff = abs(float(away_diff_raw)) if away_diff_raw is not None else 0
        
        # Get the maximum difference (highest trap indicator)
        max_diff = max(home_diff, away_diff)
        
        # Determine status based on difference
        
        if max_diff > 30:
            if moneyline.get("status") != TrapStatus.TRAP_CITY.value:
                result["moneyline"] = TrapStatus.TRAP_CITY.value
                result["moneyline_change"] = TrapChange.UPGRADE.value
                result["update"] = True
        elif max_diff > 20:
            prev_status = moneyline.get("status")
            if prev_status != TrapStatus.TRAP_DETECTED.value:
                result["moneyline"] = TrapStatus.TRAP_DETECTED.value
                result["update"] = True
                if prev_status == TrapStatus.TRAP_CITY.value:
                    result["moneyline_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["moneyline_change"] = TrapChange.UPGRADE.value
        elif max_diff > 10:
            prev_status = moneyline.get("status")
            if prev_status != TrapStatus.TRAP_POTENTIAL.value:
                result["moneyline"] = TrapStatus.TRAP_POTENTIAL.value
                result["update"] = True
                if prev_status == TrapStatus.TRAP_DETECTED.value or prev_status == TrapStatus.TRAP_CITY.value:
                    result["moneyline_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["moneyline_change"] = TrapChange.UPGRADE.value
        else:
            result["moneyline"] = None
            result["moneyline_change"] = None

    # SPREAD 
    # Skip if no Moneyline data
    if spread:
        # Extract diff values from home and away (case-insensitive check)
        home_data = spread.get("Home") or spread.get("home", {})
        away_data = spread.get("Away") or spread.get("away", {})
        # Get diff values, handle None/empty cases
        home_diff_raw = home_data.get("diff") if isinstance(home_data, dict) else None
        away_diff_raw = away_data.get("diff") if isinstance(away_data, dict) else None
        
        home_diff = abs(float(home_diff_raw)) if home_diff_raw is not None else 0
        away_diff = abs(float(away_diff_raw)) if away_diff_raw is not None else 0
        
        # Get the maximum difference (highest trap indicator)
        max_diff = max(home_diff, away_diff)
        
        # Determine status based on difference
        
        if max_diff > 30:
            if spread.get("status") != TrapStatus.TRAP_CITY.value:
                result["spread"] = TrapStatus.TRAP_CITY.value
                result["spread_change"] = TrapChange.UPGRADE.value
                result["update"] = True
        elif max_diff > 20:
            prev_status = spread.get("status")
            if prev_status != TrapStatus.TRAP_DETECTED.value:
                result["spread"] = TrapStatus.TRAP_DETECTED.value
                result["update"] = True
                if prev_status == TrapStatus.TRAP_CITY.value:
                    result["spread_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["spread_change"] = TrapChange.UPGRADE.value
        elif max_diff > 10:
            prev_status = spread.get("status")
            if prev_status != TrapStatus.TRAP_POTENTIAL.value:
                result["spread"] = TrapStatus.TRAP_POTENTIAL.value
                result["update"] = True
                if prev_status == TrapStatus.TRAP_DETECTED.value or prev_status == TrapStatus.TRAP_CITY.value:
                    result["spread_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["spread_change"] = TrapChange.UPGRADE.value
        else:
            result["spread"] = None
            result["spread_change"] = None
    
    # TOTAL 
    # Skip if no Total data
    if total:
        # Extract diff values from home and away (case-insensitive check)
        home_data = total.get("Home") or total.get("home", {})
        away_data = total.get("Away") or total.get("away", {})
        # Get diff values, handle None/empty cases
        home_diff_raw = home_data.get("diff") if isinstance(home_data, dict) else None
        away_diff_raw = away_data.get("diff") if isinstance(away_data, dict) else None
        
        home_diff = abs(float(home_diff_raw)) if home_diff_raw is not None else 0
        away_diff = abs(float(away_diff_raw)) if away_diff_raw is not None else 0
        
        # Get the maximum difference (highest trap indicator)
        max_diff = max(home_diff, away_diff)
        
        # Determine status based on difference
        
        if max_diff > 30:
            if total.get("status") != TrapStatus.TRAP_CITY.value:
                result["total"] = TrapStatus.TRAP_CITY.value
                result["total_change"] = TrapChange.UPGRADE.value
                result["update"] = True
        elif max_diff > 20:
            prev_status = total.get("status")
            if prev_status != TrapStatus.TRAP_DETECTED.value:
                result["total"] = TrapStatus.TRAP_DETECTED.value
                result["update"] = True
                if prev_status == TrapStatus.TRAP_CITY.value:
                    result["total_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["total_change"] = TrapChange.UPGRADE.value
        elif max_diff > 10:
            prev_status = total.get("status")
            if prev_status != TrapStatus.TRAP_POTENTIAL.value:
                result["total"] = TrapStatus.TRAP_POTENTIAL.value
                result["update"] = True
                if prev_status == TrapStatus.TRAP_DETECTED.value or prev_status == TrapStatus.TRAP_CITY.value:
                    result["total_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["total_change"] = TrapChange.UPGRADE.value
        else:
            result["total"] = None
            result["total_change"] = None

    return result
    

async def calculate_traps() -> tuple[int, int, int, list[str], list[str], list[str]]:
    """
    Calculate traps for all games by reading events from Firestore,
    checking if there's an update in status and if so, updating status field.
    
    Status assignment based on difference:
    - TC (Trap City): difference > 30
    - TD (Trap Detected): difference > 20
    - TP (Trap Potential): difference > 10
    
    Returns: (TC_count, TD_count, TP_count) as well as the games ids that were updated
    """
    TC_count = 0
    TC_games_ids = []
    TD_count = 0
    TD_games_ids = []
    TP_count = 0
    TP_games_ids = []
    
    # Get all events from Firestore
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

        result_data = await detect_trap_diff(current_odds)

        # update results for 3, want to get status
        # Note: result_data["moneyline"]/["spread"]/["total"] are only set when there's an actual change
        if result_data["moneyline"] is not None:
            updated_odds_with_trap_status["Moneyline"]["Status"] = result_data["moneyline"]
            if "StatusFactors" not in updated_odds_with_trap_status["Moneyline"]:
                updated_odds_with_trap_status["Moneyline"]["StatusFactors"] = {}
            updated_odds_with_trap_status["Moneyline"]["StatusFactors"]["Diff"] = result_data["moneyline"]
            if result_data["moneyline"] == TrapStatus.TRAP_CITY.value:
                TC_count += 1
                TC_games_ids.append(event_doc.id)
            elif result_data["moneyline"] == TrapStatus.TRAP_DETECTED.value:
                TD_count += 1
                TD_games_ids.append(event_doc.id)
            elif result_data["moneyline"] == TrapStatus.TRAP_POTENTIAL.value:
                TP_count += 1
                TP_games_ids.append(event_doc.id)

        if result_data["spread"] is not None:
            updated_odds_with_trap_status["Spread"]["Status"] = result_data["spread"]
            if "StatusFactors" not in updated_odds_with_trap_status["Spread"]:
                updated_odds_with_trap_status["Spread"]["StatusFactors"] = {}
            updated_odds_with_trap_status["Spread"]["StatusFactors"]["Diff"] = result_data["spread"]
            if result_data["spread"] == TrapStatus.TRAP_CITY.value:
                TC_count += 1
                TC_games_ids.append(event_doc.id)
            elif result_data["spread"] == TrapStatus.TRAP_DETECTED.value:
                TD_count += 1
                TD_games_ids.append(event_doc.id)
            elif result_data["spread"] == TrapStatus.TRAP_POTENTIAL.value:
                TP_count += 1
                TP_games_ids.append(event_doc.id)

        if result_data["total"] is not None:
            updated_odds_with_trap_status["Total"]["Status"] = result_data["total"]
            if "StatusFactors" not in updated_odds_with_trap_status["Total"]:
                updated_odds_with_trap_status["Total"]["StatusFactors"] = {}
            updated_odds_with_trap_status["Total"]["StatusFactors"]["Diff"] = result_data["total"]
            if result_data["total"] == TrapStatus.TRAP_CITY.value:
                TC_count += 1
                TC_games_ids.append(event_doc.id)
            elif result_data["total"] == TrapStatus.TRAP_DETECTED.value:
                TD_count += 1
                TD_games_ids.append(event_doc.id)
            elif result_data["total"] == TrapStatus.TRAP_POTENTIAL.value:
                TP_count += 1
                TP_games_ids.append(event_doc.id)

        # Update status in Firestore only when there's at least one change
        if result_data["update"]:
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