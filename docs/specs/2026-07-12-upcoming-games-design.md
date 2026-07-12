# Upcoming Games View (Look-Ahead) — Design

**Date:** 2026-07-12
**Status:** Implemented & verified (2026-07-12)
**Depends on:** apps-script pagination fix (f878146) — the sheet now carries DK's full ~30-day horizon

## Problem

The frontend only ever shows one day at a time, defaulting to today. Users want to
look ahead. Date-picker plumbing already works end-to-end (verified: picking Jul 12
shows all 14 of tomorrow's games) — the gaps are defaults and discoverability:
"Upcoming" means only "today", and future dates on the Dashboard show an empty trap
board with no explanation (flags develop as game-day money arrives, so future days
legitimately have none).

## Approach (user-picked: Option A + one new endpoint)

One new GET endpoint alongside the existing per-day one, returning every upcoming
game with no per-day filter. Rationale: the odds collection's *upcoming* horizon is
bounded by what DK lists (~30 days), so the payload stays small. The All Games
"Upcoming" default renders it grouped by day; picking a specific date keeps using
the existing single-day endpoint.

## Backend

### `GET /games/upcoming` (new, next to `GET /games`)

- Repository: `get_upcoming_events()` — `where gameTimeET >= <today ET as "YYYY-MM-DD">`.
  Single-field range on the same string format the per-day query uses; no composite
  index needed. **Deliberately bounded at today-or-later** rather than a literal
  full-collection scan: completed games accumulate in the `odds` collection forever,
  and DK's horizon only guarantees the *forward* window stays small. Today's games
  (including completed/live ones) are part of the window.
- Service: `get_upcoming_games()` — same slim summaries as `get_games()`
  (id/league/teams/time/status/liveScore/finalScore/scoresUpdatedAt), grouped
  day-first then league, days ordered ascending.
- DTO `GamesUpcomingResponse`:
  ```
  { generatedAt, todayET,
    days: [ { dateET, by_league: {leagueKey: summary[]}, total } ],
    total }
  ```
- Route follows games.py patterns; no auth (public read like the rest of the feed).

## Frontend

### All Games page

- `filters.date === 'upcoming'` (the default) → `gamesApiService.getUpcomingGames()`,
  rendered as **day sections**: "Today", "Tomorrow", then "Sun Jul 13" style headers,
  each containing the existing league groups + GameRow list. Search/league filters
  apply across all days.
- Picking a specific date in the DatePicker → existing single-day fetch + render,
  unchanged.
- `fetch.games.ts` gains `getUpcomingGames()`; `types/odds.ts` gains
  `ApiUpcomingGamesResponse`.

### Dashboard

- Future-date empty state: when the selected date has games but zero flagged traps,
  show a notice instead of the bare empty board: "No traps flagged yet — splits
  develop as game-day money comes in." with a link to All Games for that date.

## Implementation checklist (update as steps complete)

- [x] 1. Design doc committed
- [x] 2. Backend: `get_upcoming_events()` repository query (gameTimeET >= today ET)
- [x] 3. Backend: `get_upcoming_games()` service + `GamesUpcomingResponse` DTO + `GET /games/upcoming` route (registered before `/games/{game_id}`)
- [x] 4. Frontend: `getUpcomingGames()` service + `ApiUpcomingGamesResponse` type
- [x] 5. Frontend: All Games "Upcoming" mode renders day sections (Today/Tomorrow/weekday headers) with league groups; single-date picker mode unchanged
- [x] 6. Dashboard: "No traps flagged yet" notice with slate count + See-all-games link (only when the day has games, no flags, and no user filters active)
- [x] 7. Verified: `GET /games/upcoming` → todayET 2026-07-12, 14 games in one day (DK's splits horizon only lists ~1-2 days out, so only one day exists in data right now — the multi-day render path is the same loop and will populate as DK lists further days). All Games "Upcoming" shows the "Today · July 12" day header + MLB(14) group. Dashboard shows the "No traps flagged yet / 14 games on this slate / See all games" notice (today: games present, zero flags). tsc + vite build clean.
