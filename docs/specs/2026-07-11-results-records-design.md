# Results, Records & Score Polling — Design

**Date:** 2026-07-11
**Status:** Approved for implementation

## Goal

Grade every user vote and every system trap flag against final scores, so the app can show
per-user records (wins/losses/pushes), a leaderboard, and the system's "Trap City Record"
per trap tier. Scores come from The Odds API `/scores` endpoint via a scheduled poller that
only spends API credits while games are plausibly live.

Live in-game score updates are **out of scope** for this phase (too expensive at current
API budget). The poller is built so the cadence is one constant away from supporting it later.

## Data model (Firestore)

### `user_picks` (new top-level collection)

One doc per user per opportunity. Doc ID: `{userId}_{gameId}_{market}` — idempotent by
construction, mirroring the votes dedup (votes live at `social/{oppId}/votes/{userId}`).

```
{
  userId: string,
  gameId: string,             // sheet-style id, e.g. "baseballmlb_2026-07-11T12:05_PIT Pirates_MIL Brewers"
  opportunityId: string,      // "{gameId}_{market lowercase}"
  league: string,             // LeagueKey value, kept for future per-league records
  market: "Moneyline" | "Spread" | "Total",
  side: "home" | "away" | "over" | "under",
  gameTimeET: string,
  result: "pending" | "win" | "loss" | "push",
  generatedAt: string,        // ISO UTC
  evaluatedAt: string | null
}
```

`gameId` + `league` + `market` are denormalized onto every pick so per-league / per-market
records can be added later without a migration.

### `users/{userId}` (new)

Profile + running totals. **`displayName` here is the source of truth** for all social
features (comments currently carry a client-supplied `display_name` per request; that goes
away — see POST /comments changes).

```
{
  displayName: string,        // from Firebase token `name` claim on first write; "Anonymous" fallback
  record: { wins: number, losses: number, pushes: number },
  createdAt: string,
  updatedAt: string
}
```

Created lazily on a user's first authenticated write (vote or comment). Totals are
incremented transactionally at evaluation time — never recomputed on read.

### `trap_results/{opportunityId}` (new)

One doc per flagged market once graded — the audit trail behind the system record.

```
{
  gameId: string,
  league: string,
  market: string,
  status: "TC" | "TD" | "TP",   // trap tier at evaluation time
  statusSide: "home" | "away" | "over" | "under",  // the public side the flag identified
  outcome: "win" | "loss" | "push",   // system WINS when statusSide LOSES
  finalScore: { home: number, away: number },
  evaluatedAt: string
}
```

### `system_records/{status}` (new)

Aggregate docs with IDs `TC`, `TD`, `TP`, `overall`, each `{ wins, losses, pushes }`.
This is what "Trap City Record" reads from.

### `events` docs (existing — new fields)

- `finalScore: { home: number, away: number }` — written when the poller sees `completed: true`
- `status: "unstarted" | "live" | "completed"` — replaces the current
  `scheduled | live | final` values. The `EventStatus` enum and the sheet import's initial
  status are updated accordingly.
- `scoresUpdatedAt: string`

## Grading rules

Spread `Line` is stored from the **home team's perspective** (the frontend already renders
it this way).

| Market | Win condition for a side | Push |
|---|---|---|
| Moneyline | that team has the higher final score | tie score (league-dependent, rare) |
| Spread | `homeScore + Line > awayScore` → home covers; `<` → away covers | `homeScore + Line == awayScore` (whole-number lines only; `.5` lines cannot push) |
| Total | `home + away > Line` → over; `<` → under | `home + away == Line` |

- **User pick:** win if their side won the market, loss if it lost, push if push.
- **System (trap flag):** the flag's `StatusSide` marks the public side. **System wins when
  `StatusSide` loses.** Push → push. Only flagged markets (Status TC/TD/TP) count toward
  system records; each contributes to its tier doc and `overall`.
- Pushes are recorded on both user and system records as `pushes` (not wins, not losses).

## API changes

### POST /votes (modify)

Auth dependency changes from returning just `uid` to returning the decoded token
(uid + `name` claim). On a successful (non-duplicate) vote:

1. Vote doc written at `social/{oppId}/votes/{userId}` (unchanged).
2. `user_picks/{userId}_{gameId}_{market}` created with `result: "pending"`.
3. `users/{userId}` created if missing (displayName from token `name`, else "Anonymous").

Duplicate vote → no pick created, no counters touched (endpoint already returns the
existing-vote response).

### POST /comments (modify)

`display_name` is **removed from the request body**. The backend resolves the display name:
`users/{userId}.displayName` if the doc exists, else token `name` claim (creating the users
doc at the same time), else "Anonymous". The resolved name is still stamped onto each
comment doc (comments render without extra reads; a rename affects future comments only).

Frontend: `socialApiService.postComment()` stops sending `display_name`.

### New read endpoints

- `GET /users/me/record` (auth) — `users/{uid}` profile + totals
- `GET /users/me/picks?limit&cursor` (auth) — pick history, `generatedAt` desc,
  cursor-paginated like comments
- `GET /records/system` — the four `system_records` docs
- `GET /leaderboard?limit=25` — users ordered by `record.wins` desc

Route/service/repository/DTO layering follows the existing pattern (`routes/users.py`,
`service/users_service.py`, `repository/users_repository.py`, etc.).

## Scores poller — `backend/src/main/tasks/scores_task.py`

Runs under the previously empty `tasks/` folder. Exposes `POST /api/tasks/poll-scores`
guarded by the existing `scheduler_secret` setting (`X-Scheduler-Secret` header), wired via
the `tasks_router` include that is currently commented out in `main.py`. Cloud Scheduler
hits it **every 30 minutes** — same operational pattern as the Google Sheets odds import.

Tunables at the top of the file:

```python
POLL_DAYS_FROM = 1                    # /scores daysFrom param (cost 2 per call)
GAME_DURATION_HOURS = {
    "baseballmlb": 3.5,
    "americanfootballnfl": 3.5,
    "americanfootballncaaf": 3.5,
    "basketballnba": 2.5,
    "basketballncaab": 2.5,
    "icehockeynhl": 3.0,
}
COMPLETION_GRACE_HOURS = 6
```

Per league, each run:

1. **Liveness gate (0 API credits).** Read today's + yesterday's events from Firestore.
   Poll the league only if at least one game with `status != "completed"` satisfies
   `start <= now <= start + duration + COMPLETION_GRACE_HOURS`. Off day or everything
   already completed → skip league entirely.
   - Grace exists because durations are estimates: extra innings / OT / delays run long,
     and Odds API can lag flipping `completed: true`. The window stays open a few extra
     hours until every game actually reports completed; on normal days it closes as soon
     as all games are final, so grace costs nothing.
2. **Fetch.** `GET /v4/sports/{OddsApiLeagueKey}/scores?daysFrom=1&apiKey=...` (quota cost 2).
3. **Match** each returned event to the sheet-based event doc: same league + same ET date +
   Odds API full team name ends with the sheet nickname
   (`"Pittsburgh Pirates"` ↔ `"PIT Pirates"` → suffix "Pirates"). Ambiguous or no match →
   log a warning and skip; never guess.
4. **Persist.** Matched + `completed: true` → write `finalScore`, `status: "completed"`,
   `scoresUpdatedAt`, then invoke the evaluation service for that game.
   Matched + not completed but past start → `status: "live"`.
5. **Idempotency.** Games already `status == "completed"` in Firestore are never
   re-evaluated; evaluation itself only grades picks with `result == "pending"`.

Expected cost: ~2 credits x polls-while-live x leagues-with-games. Roughly 10-40
credits/day in a single-league season, zero on off days.

## Evaluation — `service/results_service.py`

`evaluate_game(event_doc)`:

1. Compute market outcomes from `finalScore` + `currentOdds` lines per the grading table.
2. For each market: query `user_picks` where `gameId == X`, `market == M`,
   `result == "pending"`. For each pick, in a **transaction**: set `result` +
   `evaluatedAt`, increment `users/{userId}.record.{wins|losses|pushes}`.
3. For each flagged market (`Status` in TC/TD/TP with a `StatusSide`): outcome = invert
   the public side's result (win when StatusSide loses; push stays push). Write
   `trap_results/{opportunityId}` (skip if it already exists — idempotency) and increment
   `system_records/{status}` and `system_records/overall` in a transaction.

## Firestore indexes & rules

- Composite index: `user_picks (gameId asc, market asc, result asc)` — evaluation query.
- Composite index: `user_picks (userId asc, generatedAt desc)` — pick history.
- Rules: `user_picks` readable by the owning user (`request.auth.uid == resource.data.userId`);
  `users/{userId}` readable publicly (leaderboard), writable by no client (backend only via
  Admin SDK); `trap_results` + `system_records` public read, no client writes.

## Testing

- **Unit:** grading rules — win/loss/push per market, home/away line signs, system
  inversion, `.5` line never pushes.
- **E2E (manual):** hand-write a `finalScore` + reset `status` on a test game, call
  `POST /api/tasks/poll-scores` with the secret (or invoke evaluation directly), verify:
  pending picks flip, `users` totals increment, `trap_results` + `system_records` update,
  second run is a no-op.

## Out of scope (explicit)

- Live in-game score display/ticker (poller cadence + `status: "live"` writes already lay
  the groundwork; enabling it later is a cadence + frontend change).
- Per-league / per-market user records (data already captured on picks).
- Display name editing endpoint (`PATCH /users/me`) — later.
- Vote changes/deletions — votes remain immutable first-write-wins.
