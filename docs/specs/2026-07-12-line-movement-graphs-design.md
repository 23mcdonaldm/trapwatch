# Line Movement Graphs on GameDetail — Design

**Date:** 2026-07-12
**Status:** Implemented & verified in browser (2026-07-12)
**Note:** Per Miles — no git add/commit by Claude; he commits himself.

## Problem

Each `odds/{event_id}` doc has `ml_history`, `spread_history`, `total_history`
subcollections (one snapshot per sheet import, ~hourly, so ~20–40 points per game).
Nothing surfaces them. The game page should show price movement per market.

Data shape (verified live): ML docs are `{runTimestamp, home: {odds, betsPct,
handlePct, diff, flag}, away: {...}}`; spread/total add top-level `line` (spread
line is from the HOME team's perspective) and use `over`/`under` keys for totals.

## Decisions (from brainstorming)

- **Spread/Total render the LINE as a step chart** (option A) — line movement is
  the story; you can't chart price across a line change because the old line's
  price stops being tracked. Price/splits live on the points, not the axis.
- **Moneyline renders the selected team's American odds** as a plain line chart.
- **Every rendered point is clickable** → tooltip with time (ET), price
  (American odds), bets %, handle % for the selected side — same interaction on
  all three charts.
- **Toggle uses real names**: team short names for ML + Spread ("Cubs"/"Reds"),
  "Over"/"Under" for Total. Spread line flips sign with the toggle (home +1.5 ↔
  away -1.5). Total's line is shared; the toggle only changes which side's
  price/splits the points report.
- **Placement:** one compact chart embedded in each of GameDetail's three market
  sections, collapsed behind a "📈 Movement" toggle (option A over a combined
  tabbed section).
- **Simplicity/de-noising:** imports append snapshots even when nothing changed,
  so the chart plots the full series for honest time spacing but only draws
  clickable dots where something changed (line, price, or splits) plus first and
  last points.
- **Sparse data:** a single snapshot still renders (one dot, clickable); only a
  truly empty series shows "Not enough movement data yet".
- **No chart library** — hand-rolled SVG. Three sparklines don't justify a
  recharts dependency, and custom SVG matches the app's styling.

## Backend

`GET /games/{game_id}/history` (one call returns all three series; payloads tiny):

```
{ generatedAt, gameId,
  moneyline: [ {t, home: {odds, betsPct, handlePct}, away: {...}} ],
  spread:    [ {t, line, home: {...}, away: {...}} ],
  total:     [ {t, line, over: {...}, under: {...}} ] }
```

- Repository: `get_event_history(game_id)` reads the three subcollections
  ordered by `runTimestamp`.
- Service: 404 when the game doc doesn't exist; otherwise slims each side to
  `{odds, betsPct, handlePct}` and maps `runTimestamp` → `t`.
- Route registered on the existing games router (`/{game_id}/history` doesn't
  collide with `/{game_id}` — different path shape).

## Frontend

- `types/odds.ts`: `ApiHistoryPoint`/`ApiGameHistoryResponse` types.
- `fetch.games.ts`: `getGameHistory(gameId)`.
- `components/MovementChart.tsx` (new, reusable): props = points, side options
  (`[{key, label}]`), mode (`odds` line chart | `line` step chart), optional
  sign flip for the away-spread perspective. Internals: SVG with time-scaled x
  axis (ET labels), 3-tick y axis, step-after path for lines / linear path for
  odds, change-point dots, click → tooltip (time, odds, bets %, handle %).
- `GameDetail.tsx`: history fetched lazily once (page-level state) the first
  time any section's "📈 Movement" toggle opens; each market section renders its
  chart with its own toggle + side chips.

## Checklist

- [x] 1. Spec written (Miles commits)
- [x] 2. Backend: `get_event_history` repo + `get_game_history` service + `GameHistoryResponse` DTO + `GET /games/{game_id}/history`
- [x] 3. Frontend: `ApiHistoryPoint`/`ApiGameHistoryResponse` types + `getGameHistory` fetch
- [x] 4. Frontend: `components/MovementChart.tsx` (SVG, side toggle w/ real names, change-point dots, click detail row, step + odds modes, single-point renders a lone dot, empty → "Not enough movement data yet")
- [x] 5. GameDetail: `MovementPanel` collapsed toggle per market section; history fetched once lazily on first open; state reset on game navigation
- [x] 6. Verified live on Cubs@Reds: curl endpoint returns 4/3/4 points; all three charts render; ML click-tooltip shows "Jul 12 11:01 AM ET · Price -131 · Bets 69% · Handle 10%" (matches raw snapshot); spread toggle flips Reds +1.5 ↔ Cubs -1.5; total shows unsigned 9.5; tsc + vite build clean. Not committed — Miles commits.
