# Trap Status Algorithm Rework: Single Authority + NO_TRAP Downgrades — Design

**Date:** 2026-07-12
**Status:** Approved — implementation in progress

## Problem

1. `Status` never clears: every detector's "below threshold" branch sets its result to
   `None` without flagging `update`, and `calculate_traps` skips `None` results — so a
   market flagged TC at 100% bets stays TC forever after the split settles to 50/50.
   (Verified live: Firestore `set(merge=True)` deep-merges, so the hourly sheet import
   also preserves stale Status fields.) This poisons both the UI and system grading.
2. Two detectors compete to write `Status` (PublicMoney overwrote Diff), so "everything
   is a trap" — there's no single owner of what TC/TD/TP means.
3. All `prev_status` reads use lowercase `"status"` but the stored field is `"Status"`,
   so prev is always None and change-tracking never worked.

## Design

### One authority: `detect_trap_status` (Miles wrote the ML section; this completes it)

The ONLY function that sets `Status`/`StatusSide`. Per market, public side must pass
all gates, then the stored `diff` (= handlePct − betsPct, so negative when tickets
outweigh money) sets the tier:

- **Gates:** side odds ≥ −350, side betsPct ≥ 65
- **Tiers:** diff ≤ −50 → TC · diff ≤ −35 → TD · diff ≤ −25 → TP · else → **NT**
- **Public side:** Moneyline = the favorite (by odds); Spread = higher-bets% side
  (Home/Away); Total = higher-bets% side (Over/Under). Spread/Total sections are
  rewritten from the old copied >90/80/70 bets% logic onto these same criteria.

### `NO_TRAP` ("NT") as a real enum member — no field deletion

`TrapStatus.NO_TRAP = "NT"`, ranked `NT(0) < TP(1) < TD(2) < TC(3)`. Every detector
always computes a tier (never `None`), and each market block collapses to one
symmetric comparison — upgrades and downgrades are the same code path:

```
new  = computed tier (NT when gates fail / below threshold)
prev = stored value for THIS detector, missing field == NT
if new != prev:
    emit status=new, side=(side unless NT, then None),
         change=UPGRADE if rank(new) > rank(prev) else DOWNGRADE, update=True
```

"Missing == NT" keeps never-flagged games from being rewritten every run; a stale
TC → NT transition writes exactly once (self-healing: the first `GET /traps` run
after deploy auto-downgrades every stale flag — no separate cleanup script).

`prev` sources (fixes the lowercase-"status" bug): `detect_trap_status` reads
`market["Status"]`; `detect_trap_diff` reads `market["StatusFactors"]["Diff"][0]`;
`detect_trap_public_money` reads `market["StatusFactors"]["PublicMoney"][0]`.

### Demoted detectors: StatusFactors only

`detect_trap_diff` (unchanged thresholds) and `detect_trap_public_money` (unchanged
thresholds) keep running but ONLY write their `StatusFactors.Diff` /
`StatusFactors.PublicMoney` tuples — they feed the frontend trigger pills, never
`Status`. `calculate_traps` counts TC/TD/TP from `detect_trap_status` results only.

### Downstream effects (traced)

- `results_service.TRAP_STATUSES = {TC,TD,TP}` excludes NT → grading unaffected;
  NT markets simply aren't system-graded (StatusSide is None anyway).
- Frontend `TRAP_STATUS_MAP` / `statusRank` don't know NT → falls through as
  "no trap", same as a missing field. One real fix needed: `generateTriggers`
  renders a pill for ANY StatusFactors tuple — add a guard to skip NT entries.
- Past `trap_results`/`system_records` gradings stand as-is (history is not
  retroactively re-graded; some early entries were graded off stale flags — accepted).
- Stale docstrings on `calculate_traps` / the `/traps` route updated to the new criteria.

## Implementation checklist (update as steps complete)

- [ ] 1. Doc committed
- [ ] 2. `TrapStatus.NO_TRAP = "NT"` + `TRAP_RANK` in enums/trap_status.py
- [ ] 3. `detect_trap_status`: fix prev source ("Status"), NT branch, rewrite Spread/Total onto new criteria
- [ ] 4. `detect_trap_diff` + `detect_trap_public_money`: NT + prev from own StatusFactors slot; same symmetric comparison
- [ ] 5. `calculate_traps`: Status/StatusSide/counts from `detect_trap_status` only; public_money → StatusFactors only; docstrings updated
- [ ] 6. Frontend: `generateTriggers` skips NT StatusFactors entries
- [ ] 7. Unit tests for detect_trap_status (gates, tiers, NT downgrade, missing-prev quiet)
- [ ] 8. Verify: run GET /traps against live data — stale flags downgrade to NT once, second run is a no-op; frontend still renders correctly
