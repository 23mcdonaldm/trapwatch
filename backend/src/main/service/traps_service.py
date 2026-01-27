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
        home_data = moneyline.get("Home") or moneyline.get("home", {})
        home_handle_pct = home_data.get("handlePct") or 0
        home_bets_pct = home_data.get("betsPct") or 0
        sharp_diff = abs(home_handle_pct - home_bets_pct)
        trap_side = "Home" if home_bets_pct > home_handle_pct else "Away"
        
        # Determine status based on difference
        
        if sharp_diff > 40:
            if moneyline.get("status") != TrapStatus.TRAP_CITY.value:
                result["moneyline"] = TrapStatus.TRAP_CITY.value
                result["moneyline_change"] = TrapChange.UPGRADE.value
                result["moneyline_side"] = trap_side
                result["update"] = True
        elif sharp_diff > 30:
            prev_status = moneyline.get("status")
            if prev_status != TrapStatus.TRAP_DETECTED.value:
                result["moneyline"] = TrapStatus.TRAP_DETECTED.value
                result["moneyline_side"] = trap_side
                result["update"] = True
                if prev_status == TrapStatus.TRAP_CITY.value:
                    result["moneyline_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["moneyline_change"] = TrapChange.UPGRADE.value
        elif sharp_diff > 20:
            prev_status = moneyline.get("status")
            if prev_status != TrapStatus.TRAP_POTENTIAL.value:
                result["moneyline"] = TrapStatus.TRAP_POTENTIAL.value
                result["moneyline_side"] = trap_side
                result["update"] = True
                if prev_status == TrapStatus.TRAP_DETECTED.value or prev_status == TrapStatus.TRAP_CITY.value:
                    result["moneyline_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["moneyline_change"] = TrapChange.UPGRADE.value
        else:
            result["moneyline"] = None
            result["moneyline_side"] = None
            result["moneyline_change"] = None

    # SPREAD 
    # Skip if no Moneyline data
    if spread:
        home_data = spread.get("Home") or spread.get("home", {})
        home_handle_pct = home_data.get("handlePct") or 0
        home_bets_pct = home_data.get("betsPct") or 0
        sharp_diff = abs(home_handle_pct - home_bets_pct)
        trap_side = "Home" if home_bets_pct > home_handle_pct else "Away"
        
        # Determine status based on difference
        
        if sharp_diff > 30:
            if spread.get("status") != TrapStatus.TRAP_CITY.value:
                result["spread"] = TrapStatus.TRAP_CITY.value
                result["spread_change"] = TrapChange.UPGRADE.value
                result["spread_side"] = trap_side
                result["update"] = True
        elif sharp_diff > 20:
            prev_status = spread.get("status")
            if prev_status != TrapStatus.TRAP_DETECTED.value:
                result["spread"] = TrapStatus.TRAP_DETECTED.value
                result["spread_side"] = trap_side
                result["update"] = True
                if prev_status == TrapStatus.TRAP_CITY.value:
                    result["spread_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["spread_change"] = TrapChange.UPGRADE.value
        elif sharp_diff > 10:
            prev_status = spread.get("status")
            if prev_status != TrapStatus.TRAP_POTENTIAL.value:
                result["spread"] = TrapStatus.TRAP_POTENTIAL.value
                result["spread_side"] = trap_side
                result["update"] = True
                if prev_status == TrapStatus.TRAP_DETECTED.value or prev_status == TrapStatus.TRAP_CITY.value:
                    result["spread_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["spread_change"] = TrapChange.UPGRADE.value
        else:
            result["spread"] = None
            result["spread_side"] = None
            result["spread_change"] = None
    
    # TOTAL 
    # Skip if no Total data
    if total:
        home_data = total.get("Home") or total.get("home", {})
        home_handle_pct = home_data.get("handlePct") or 0
        home_bets_pct = home_data.get("betsPct") or 0
        sharp_diff = abs(home_handle_pct - home_bets_pct)
        trap_side = "Home" if home_bets_pct > home_handle_pct else "Away"
        
        # Determine status based on difference
        
        if sharp_diff > 30:
            if total.get("status") != TrapStatus.TRAP_CITY.value:
                result["total"] = TrapStatus.TRAP_CITY.value
                result["total_change"] = TrapChange.UPGRADE.value
                result["total_side"] = trap_side
                result["update"] = True
        elif sharp_diff > 20:
            prev_status = total.get("status")
            if prev_status != TrapStatus.TRAP_DETECTED.value:
                result["total"] = TrapStatus.TRAP_DETECTED.value
                result["total_side"] = trap_side
                result["update"] = True
                if prev_status == TrapStatus.TRAP_CITY.value:
                    result["total_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["total_change"] = TrapChange.UPGRADE.value
        elif sharp_diff > 10:
            prev_status = total.get("status")
            if prev_status != TrapStatus.TRAP_POTENTIAL.value:
                result["total"] = TrapStatus.TRAP_POTENTIAL.value
                result["total_side"] = trap_side
                result["update"] = True
                if prev_status == TrapStatus.TRAP_DETECTED.value or prev_status == TrapStatus.TRAP_CITY.value:
                    result["total_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["total_change"] = TrapChange.UPGRADE.value
        else:
            result["total"] = None
            result["total_side"] = None
            result["total_change"] = None

    return result

async def detect_trap_public_money(current_odds: dict) -> dict:
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
        home_data = moneyline.get("Home") or moneyline.get("home", {})
        away_data = moneyline.get("Away") or moneyline.get("away", {})
        home_odds = home_data.get("odds") or 0
        away_odds = away_data.get("odds") or 0
        favorite_side = "Home" if home_odds < away_odds else "Away"
        if favorite_side == "Home":
            favorite_bets_pct = home_data.get("betsPct") or 0
            favorite_odds = home_odds
        else:
            favorite_bets_pct = away_data.get("betsPct") or 0
            favorite_odds = away_odds
        
        if favorite_odds >= -300:
            # Determine status based on difference
            if favorite_bets_pct > 90:
                if moneyline.get("status") != TrapStatus.TRAP_CITY.value:
                    result["moneyline"] = TrapStatus.TRAP_CITY.value
                    result["moneyline_change"] = TrapChange.UPGRADE.value
                    result["moneyline_side"] = favorite_side
                    result["update"] = True
            elif favorite_bets_pct > 80:
                prev_status = moneyline.get("status")
                if prev_status != TrapStatus.TRAP_DETECTED.value:
                    result["moneyline"] = TrapStatus.TRAP_DETECTED.value
                    result["moneyline_side"] = favorite_side
                    result["update"] = True
                    if prev_status == TrapStatus.TRAP_CITY.value:
                        result["moneyline_change"] = TrapChange.DOWNGRADE.value
                    else:
                        result["moneyline_change"] = TrapChange.UPGRADE.value
            elif favorite_bets_pct > 70:
                prev_status = moneyline.get("status")
                if prev_status != TrapStatus.TRAP_POTENTIAL.value:
                    result["moneyline"] = TrapStatus.TRAP_POTENTIAL.value
                    result["moneyline_side"] = favorite_side
                    result["update"] = True
                    if prev_status == TrapStatus.TRAP_DETECTED.value or prev_status == TrapStatus.TRAP_CITY.value:
                        result["moneyline_change"] = TrapChange.DOWNGRADE.value
                    else:
                        result["moneyline_change"] = TrapChange.UPGRADE.value
            else:
                result["moneyline"] = None
                result["moneyline_side"] = None
                result["moneyline_change"] = None
            print(f"ML Trap: {result['moneyline']}, Bets %: {favorite_bets_pct}")
        else:
            result["moneyline"] = None
            result["moneyline_side"] = None
            result["moneyline_change"] = None
        
    # SPREAD 
    # Skip if no Moneyline data
    if spread:
        home_data = spread.get("Home") or spread.get("home", {})
        away_data = spread.get("Away") or spread.get("away", {})
        home_bets_pct = home_data.get("betsPct") or 0
        away_bets_pct = away_data.get("betsPct") or 0

        
        public_side = "Home" if home_bets_pct > away_bets_pct else "Away"
        public_bets_pct = home_bets_pct if public_side == "Home" else away_bets_pct
        # Determine status based on difference
        
        if public_bets_pct > 90:
            if spread.get("status") != TrapStatus.TRAP_CITY.value:
                result["spread"] = TrapStatus.TRAP_CITY.value
                result["spread_change"] = TrapChange.UPGRADE.value
                result["spread_side"] = public_side
                result["update"] = True
        elif public_bets_pct > 80:
            prev_status = spread.get("status")
            if prev_status != TrapStatus.TRAP_DETECTED.value:
                result["spread"] = TrapStatus.TRAP_DETECTED.value
                result["spread_side"] = public_side
                result["update"] = True
                if prev_status == TrapStatus.TRAP_CITY.value:
                    result["spread_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["spread_change"] = TrapChange.UPGRADE.value
        elif public_bets_pct > 70:
            prev_status = spread.get("status")
            if prev_status != TrapStatus.TRAP_POTENTIAL.value:
                result["spread"] = TrapStatus.TRAP_POTENTIAL.value
                result["spread_side"] = public_side
                result["update"] = True
                if prev_status == TrapStatus.TRAP_DETECTED.value or prev_status == TrapStatus.TRAP_CITY.value:
                    result["spread_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["spread_change"] = TrapChange.UPGRADE.value
        
        else:
            result["spread"] = None
            result["spread_side"] = None
            result["spread_change"] = None
        print(f"Spread Trap: {result['spread']}, Bets %: {public_bets_pct}")
    # TOTAL 
    # Skip if no Total data
    if total:
        over_data = total.get("Over") or total.get("over", {})
        under_data = total.get("Under") or total.get("under", {})
        over_bets_pct = over_data.get("betsPct") or 0
        under_bets_pct = under_data.get("betsPct") or 0
        
        public_side = "Over" if over_bets_pct > under_bets_pct else "Under"
        public_bets_pct = over_bets_pct if public_side == "Over" else under_bets_pct
        # Determine status based on difference
        
        if public_bets_pct > 90:
            if total.get("status") != TrapStatus.TRAP_CITY.value:
                result["total"] = TrapStatus.TRAP_CITY.value
                result["total_change"] = TrapChange.UPGRADE.value
                result["total_side"] = public_side
                result["update"] = True
        elif public_bets_pct > 80:
            prev_status = total.get("status")
            if prev_status != TrapStatus.TRAP_DETECTED.value:
                result["total"] = TrapStatus.TRAP_DETECTED.value
                result["total_side"] = public_side
                result["update"] = True
                if prev_status == TrapStatus.TRAP_CITY.value:
                    result["total_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["total_change"] = TrapChange.UPGRADE.value
        elif public_bets_pct > 70:
            prev_status = total.get("status")
            if prev_status != TrapStatus.TRAP_POTENTIAL.value:
                result["total"] = TrapStatus.TRAP_POTENTIAL.value
                result["total_side"] = public_side
                result["update"] = True
                if prev_status == TrapStatus.TRAP_DETECTED.value or prev_status == TrapStatus.TRAP_CITY.value:
                    result["total_change"] = TrapChange.DOWNGRADE.value
                else:
                    result["total_change"] = TrapChange.UPGRADE.value
        else:
            result["total"] = None
            result["total_side"] = None
            result["total_change"] = None
        print(f"Total Trap: {result['total']}, Bets %: {public_bets_pct}")

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

        # result_data = {
        #     "moneyline": None or TP or TC or TD, 
        #     "moneyline_change": None or UPGRADE or DOWNGRADE,
        #     "moneyline_side": None or Home or Away,
        #     "spread": None or TP or TC or TD,
        #     "spread_change": None or UPGRADE or DOWNGRADE,
        #     "spread_side": None or Home or Away,
        #     "total": None or TP or TC or TD,
        #     "total_change": None or UPGRADE or DOWNGRADE,
        #     "total_side": None or Home or Away,
        #     "update": True or False,
        # }

        # Detect Trap DIFF
        diff_result_data = await detect_trap_diff(current_odds)

        # adds into status factors for Diff Check, for now diff doesn't add in to Status
        if diff_result_data["moneyline"] is not None:
            # if "Status" not in updated_odds_with_trap_status["Moneyline"]:
            #     updated_odds_with_trap_status["Moneyline"]["Status"] = diff_result_data["moneyline"]
            #     updated_odds_with_trap_status["Moneyline"]["StatusSide"] = diff_result_data["moneyline_side"]
            if "StatusFactors" not in updated_odds_with_trap_status["Moneyline"]:
                updated_odds_with_trap_status["Moneyline"]["StatusFactors"] = {}
            updated_odds_with_trap_status["Moneyline"]["StatusFactors"]["Diff"] = (diff_result_data["moneyline"], diff_result_data["moneyline_side"])

        if diff_result_data["spread"] is not None:
            # if "Status" not in updated_odds_with_trap_status["Spread"]:
            #     updated_odds_with_trap_status["Spread"]["Status"] = diff_result_data["spread"]
            #     updated_odds_with_trap_status["Spread"]["StatusSide"] = diff_result_data["spread_side"]
            if "StatusFactors" not in updated_odds_with_trap_status["Spread"]:
                updated_odds_with_trap_status["Spread"]["StatusFactors"] = {}
            updated_odds_with_trap_status["Spread"]["StatusFactors"]["Diff"] = (diff_result_data["spread"], diff_result_data["spread_side"])

        if diff_result_data["total"] is not None:
            # if "Status" not in updated_odds_with_trap_status["Total"]:
            #     updated_odds_with_trap_status["Total"]["Status"] = diff_result_data["total"]
            #     updated_odds_with_trap_status["Total"]["StatusSide"] = diff_result_data["total_side"]
            if "StatusFactors" not in updated_odds_with_trap_status["Total"]:
                updated_odds_with_trap_status["Total"]["StatusFactors"] = {}
            updated_odds_with_trap_status["Total"]["StatusFactors"]["Diff"] = (diff_result_data["total"], diff_result_data["total_side"])

        # Detect Trap PUBLIC MONEY
        public_money_result_data = await detect_trap_public_money(current_odds)
        print(f"Event ID: {event_doc.id}")
        print(f"Public Money Result Data: {public_money_result_data}")
        # Note: result_data["moneyline"]/["spread"]/["total"] are only set when there's an actual change
        if public_money_result_data["moneyline"] is not None:
            # overwrites status since public money has highest priority
            updated_odds_with_trap_status["Moneyline"]["Status"] = public_money_result_data["moneyline"]
            updated_odds_with_trap_status["Moneyline"]["StatusSide"] = public_money_result_data["moneyline_side"]
            if "StatusFactors" not in updated_odds_with_trap_status["Moneyline"]:
                updated_odds_with_trap_status["Moneyline"]["StatusFactors"] = {}
            updated_odds_with_trap_status["Moneyline"]["StatusFactors"]["PublicMoney"] = (public_money_result_data["moneyline"], public_money_result_data["moneyline_side"])    
            if public_money_result_data["moneyline"] == TrapStatus.TRAP_CITY.value:
                TC_count += 1
                TC_games_ids.append(event_doc.id)
            elif public_money_result_data["moneyline"] == TrapStatus.TRAP_DETECTED.value:
                TD_count += 1
                TD_games_ids.append(event_doc.id)
            elif public_money_result_data["moneyline"] == TrapStatus.TRAP_POTENTIAL.value:
                TP_count += 1
                TP_games_ids.append(event_doc.id)

        if public_money_result_data["spread"] is not None:
            updated_odds_with_trap_status["Spread"]["Status"] = public_money_result_data["spread"]
            updated_odds_with_trap_status["Spread"]["StatusSide"] = public_money_result_data["spread_side"]
            if "StatusFactors" not in updated_odds_with_trap_status["Spread"]:
                updated_odds_with_trap_status["Spread"]["StatusFactors"] = {}
            updated_odds_with_trap_status["Spread"]["StatusFactors"]["PublicMoney"] = (public_money_result_data["spread"], public_money_result_data["spread_side"])
            if public_money_result_data["spread"] == TrapStatus.TRAP_CITY.value:
                TC_count += 1
                TC_games_ids.append(event_doc.id)
            elif public_money_result_data["spread"] == TrapStatus.TRAP_DETECTED.value:
                TD_count += 1
                TD_games_ids.append(event_doc.id)
            elif public_money_result_data["spread"] == TrapStatus.TRAP_POTENTIAL.value:
                TP_count += 1
                TP_games_ids.append(event_doc.id)

        # TOTAL
        if public_money_result_data["total"] is not None:
            updated_odds_with_trap_status["Total"]["Status"] = public_money_result_data["total"]
            updated_odds_with_trap_status["Total"]["StatusSide"] = public_money_result_data["total_side"]
            if "StatusFactors" not in updated_odds_with_trap_status["Total"]:
                updated_odds_with_trap_status["Total"]["StatusFactors"] = {}
            updated_odds_with_trap_status["Total"]["StatusFactors"]["PublicMoney"] = (public_money_result_data["total"], public_money_result_data["total_side"])
            # right now only adds if PUBLIC MONEY, not DIFF
            # count and appending is scuffed, need to refactor with checking logic, first needs to add if DIFF, then check if already added here before double adding
            if public_money_result_data["total"] == TrapStatus.TRAP_CITY.value:
                TC_count += 1
                TC_games_ids.append(event_doc.id)
            elif public_money_result_data["total"] == TrapStatus.TRAP_DETECTED.value:
                TD_count += 1
                TD_games_ids.append(event_doc.id)
            elif public_money_result_data["total"] == TrapStatus.TRAP_POTENTIAL.value:
                TP_count += 1
                TP_games_ids.append(event_doc.id)


        # Update status in Firestore only when there's at least one change
        if diff_result_data["update"] or public_money_result_data["update"]:
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