from enum import Enum

class TrapStatus(str, Enum):
    NO_TRAP = "NT"         # Evaluated, no trap — a real stored state so downgrades stick
    TRAP_POTENTIAL = "TP"  # Trap Potential: bets−handle diff ≥ 25
    TRAP_DETECTED = "TD"   # Trap Detected: bets−handle diff ≥ 35
    TRAP_CITY = "TC"       # Trap City: bets−handle diff ≥ 50


# Severity order for upgrade/downgrade comparisons. A missing Status field is
# treated as NO_TRAP so never-flagged games aren't rewritten every run.
TRAP_RANK = {
    TrapStatus.NO_TRAP.value: 0,
    TrapStatus.TRAP_POTENTIAL.value: 1,
    TrapStatus.TRAP_DETECTED.value: 2,
    TrapStatus.TRAP_CITY.value: 3,
}


class TrapChange(str, Enum):
    UPGRADE = "upgrade"
    DOWNGRADE = "downgrade"
