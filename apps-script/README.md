# Betting Splits Scraper (Google Apps Script)

[Code.gs](Code.gs) scrapes the [DK Network betting splits page](https://dknetwork.draftkings.com/draftkings-sportsbook-betting-splits/) and populates one Google Sheet tab per league (NFL, NCAAF, NBA, NCAAB, MLB, NHL) in the exact CSV format the backend's `/csv-odds` route ingests (`backend/src/main/service/csv_odds_service.py`).

## Sheet format

| Matchup | Game Time ET | Market | Selection | Odds | Handle % | Bets % | Diff | Flag |
|---|---|---|---|---|---|---|---|---|
| MIL Brewers @ PIT Pirates | 2026-07-11T12:05 | Moneyline | PIT Pirates | -118 | 59% | 43% | 16% | |
| MIL Brewers @ PIT Pirates | 2026-07-11T12:05 | Spread | MIL Brewers -1.5 | +163 | 71% | 46% | 25% | |
| MIL Brewers @ PIT Pirates | 2026-07-11T12:05 | Total | Over 8.5 | -107 | 65% | 61% | 4% | |

Notes on the format (all required by the backend):

- **Game Time ET** is ISO-style with no `/` or `_` — the backend builds Firestore doc IDs as `{league}_{time}_{home}_{away}`, splits them on `_`, and Firestore forbids `/` in IDs.
- **Market** is normalized to `Moneyline` / `Spread` / `Total` (DK's "Run Line" and "Puck Line" become `Spread`).
- **Odds** signs are normalized to ASCII (`-118`, not DK's Unicode `−118`).
- **Diff** = Handle % − Bets % (the trap-detection input).

## Setup (one time)

1. Open the spreadsheet → **Extensions → Apps Script**, replace the default file contents with `Code.gs`, and save.
2. Run **`updateAllSplits`** once from the editor and grant the requested permissions (it needs Sheets access + `UrlFetchApp` to fetch the DK page). Each league tab should populate; off-season leagues will just have a header row.
3. Run **`setupHourlyTrigger`** once — it installs (or resets) a time-based trigger that re-runs `updateAllSplits` every hour.
4. **File → Share → Publish to web** → Entire document → CSV. Copy the published base URL up to and including `pub?`.
5. Run **`logPublishInfo`** and copy its output into `backend/.env`:

```
GOOGLE_SHEETS_BASE_URL=https://docs.google.com/spreadsheets/d/e/2PACX-…/pub?
NFL_GID=…
NCAAF_GID=…
NBA_GID=…
NCAAB_GID=…
MLB_GID=…
NHL_GID=…
```

The backend fetches each tab as `{GOOGLE_SHEETS_BASE_URL}output=csv&single=true&gid={gid}` when you hit `GET /api/v1/csv-odds`.

## Behavior details

- If a league's fetch or parse fails, its tab is **left unchanged** (stale odds beat an empty sheet mid-slate); other leagues still update.
- Games without an `AWAY @ HOME` title (e.g. soccer "X vs Y") are skipped.
- Cells are written as plain text so Sheets doesn't coerce `+163` to `163` or `65%` to `0.65`.
- DK omits the year on game dates; the script infers it, handling the Dec→Jan rollover.

## Event group IDs

The `tb_eg` values in `LEAGUES` come from the sport dropdown on the DK page. If DK ever changes them, view the page source and update the config:

| League | tb_eg |
|---|---|
| NFL | 88808 |
| NCAAF | 87637 |
| NBA | 42648 |
| NCAAB | 92483 |
| MLB | 84240 |
| NHL | 42133 |
