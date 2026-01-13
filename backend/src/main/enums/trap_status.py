from enum import Enum

class TrapStatus(str, Enum):
    TRAP_POTENTIAL = "TP"  # Trap Potential: difference > 10
    TRAP_DETECTED = "TD"   # Trap Detected: difference > 20
    TRAP_CITY = "TC"       # Trap City: difference > 30


class TrapChange(str, Enum):
    UPGRADE = "upgrade"
    DOWNGRADE = "downgrade"
