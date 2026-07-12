# Frontend Surfaces: My Picks, Leaderboard, System Record, Live/Final Scores — Design

**Date:** 2026-07-11
**Status:** Approved — implementation in progress
**Depends on:** 2026-07-11-results-records-design.md (backend, shipped in 76bb60e)

## Implementation checklist (update as steps complete)

- [ ] 1. Poller persists `liveScore` for matched in-progress games (scores_task.py)
- [ ] 2. Slim games summary (`GET /games`) includes status/liveScore/finalScore/scoresUpdatedAt
- [ ] 3. Frontend types: score fields on `Game` + `ApiGame`/`ApiGameSummary`; records/picks/leaderboard API types
- [ ] 4. `services/fetch.records.ts` — getMyRecord, getMyPicks, getSystemRecords, getLeaderboard
- [ ] 5. `utils/grading.ts` — frontend mirror of grading rules for W/L/P chips
- [ ] 6. Score badges: TrapGameCard (+ system W/L/P chip on completed trap markets), AllGames rows, GameDetail header
- [ ] 7. `/picks` page (My Record + pick history, paginated) + nav entries (Dashboard header icon, Scoreboard personal card link)
- [ ] 8. Scoreboard rewired to real `/leaderboard` + `/users/me/record`; mock-only features removed (Following tab, time windows, streaks); Most Wins | Win % toggle (min 5 picks)
- [ ] 9. Dashboard: System Record strip (overall + per-tier) from `/records/system`; also shown as card on Scoreboard
- [ ] 10. Build + typecheck + browser verification

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
