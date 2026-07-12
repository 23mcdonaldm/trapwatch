# Frontend Surfaces: My Picks, Leaderboard, System Record, Live/Final Scores — Design

**Date:** 2026-07-11
**Status:** Implemented & verified in browser (2026-07-11)
**Depends on:** 2026-07-11-results-records-design.md (backend, shipped in 76bb60e)

## Implementation checklist (update as steps complete)

- [x] 1. Poller persists `liveScore` for matched in-progress games (scores_task.py)
- [x] 2. Slim games summary (`GET /games`) includes status/liveScore/finalScore/scoresUpdatedAt
- [x] 3. Frontend types: score fields on `Game` (+trapLine) + `ApiGame`/`ApiGameSummary` (types/odds.ts); types/records.ts
- [x] 4. `services/fetch.records.ts` — getMyRecord, getMyPicks, getSystemRecords, getLeaderboard
- [x] 5. `utils/grading.ts` — frontend mirror of grading rules for W/L/P chips
- [x] 6. Score badges: components/ScoreBadge.tsx (ScoreBadge + SystemOutcomeChip) wired into TrapGameCard, AllGames rows, GameDetail header
- [x] 7. `/picks` page (pages/MyPicks.tsx, route added) + nav: Dashboard header "My Picks" (Target icon), Scoreboard header icon + personal-card button
- [x] 8. Scoreboard rewritten on real `/leaderboard` + `/users/me/record`; mock features removed; Most Wins | Win % toggle (MIN_PICKS_FOR_PCT=5)
- [x] 9. components/SystemRecordStrip.tsx on Dashboard hero + Scoreboard ("TrapWatch vs The Public")
- [x] 10. tsc + vite build clean; verified in browser with real graded data: Dashboard strip (3-10, 23%, tier chips), trap cards FINAL + score + red L chips, All Games rows FINAL + scores (all 10 MLB), Scoreboard real leaderboard (test user 1-0) + toggle + system card, /picks login gate. Signed-in /picks view unverified in browser (no login) — API verified via curl; Miles to click-test.

## Key decisions

- **Ranking:** simple toggle — Most Wins (default) and Win % with `MIN_PICKS_FOR_PCT = 5`.
  Backend `/leaderboard` unchanged (top N by wins); frontend computes pct + resorts.
  Revisit with a backend sort param only if >100 active users.
- **No game clock:** The Odds API `/scores` returns only
  `{id, sport_key, commence_time, completed, home_team, away_team, scores[{name,score}], last_update}`
  (verified live 2026-07-11). No inning/quarter/clock exists. Live cards show
  score + LIVE badge + "updated Xm ago" (from `scoresUpdatedAt`); nothing implying clock precision.
- **Live freshness = poll cadence** (30 min scheduled / manual runs). Not real-time.
- **W/L/P chip on trap cards** is computed client-side (`utils/grading.ts`) from
  finalScore + Line + StatusSide — a deliberate small mirror of
  `results_service.py` grading to avoid a per-card backend call. Keep the two in sync.
- **Scoreboard mock features removed** rather than faked: Following tab, Today/Week
  windows, streaks have no backend; showing them would be lying. Re-add if/when backed.
- Score fields flow through existing feed/games APIs automatically (event doc passthrough);
  only the slim summary endpoint needed explicit new fields.

## UI summary

- **Card score states:** live → pulsing red `LIVE` + score + updated-ago; completed →
  `FINAL` + score (winner bold); trap cards additionally get system outcome chip
  (green W / red L / slate P) for the flagged market.
- **/picks:** record card (W-L-P, win %, total picks) + paginated pick rows
  (matchup parsed from gameId, market, side, result chip, date). Auth-gated → /alerts.
- **Scoreboard:** personal stats card (rank, win %, W-L-P) + Most Wins/Win % toggle +
  real leaderboard list + "TrapWatch vs the Public" system record card.
- **Dashboard:** compact System Record strip under header: overall + 🚨TC/⚠️TD/👀TP tier chips.
