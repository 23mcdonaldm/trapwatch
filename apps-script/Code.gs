/**
 * TrapWatch — DraftKings Betting Splits Scraper
 * ==============================================
 * Scrapes https://dknetwork.draftkings.com/draftkings-sportsbook-betting-splits/
 * and writes one tab per league in the long format the TrapWatch backend
 * (backend/src/main/service/csv_odds_service.py) expects:
 *
 *   Matchup | Game Time ET | Market | Selection | Odds | Handle % | Bets % | Diff | Flag
 *
 *   - Matchup:      "AWAY @ HOME" (backend splits on " @ ")
 *   - Game Time ET: "2026-07-11T12:05" — ISO-style, NO "/" or "_" (the backend
 *                   builds Firestore doc IDs "{league}_{time}_{home}_{away}",
 *                   splits them on "_", and Firestore forbids "/" in IDs)
 *   - Market:       Moneyline | Spread | Total ("Run Line"/"Puck Line" are
 *                   normalized to Spread here, before the sheet)
 *   - Selection:    "MIL Brewers", "MIL Brewers -1.5", "Over 8.5" (ASCII signs)
 *   - Odds:         "+163" / "-118" (Unicode minus from DK is normalized)
 *   - Handle %/Bets %/Diff: "65%", "61%", "4%" (Diff = Handle − Bets)
 *   - Flag:         empty (reserved)
 *
 * Setup (one time):
 *   1. Open the target spreadsheet > Extensions > Apps Script, paste this file.
 *   2. Run updateAllSplits() once and grant permissions.
 *   3. Run setupHourlyTrigger() to refresh every hour.
 *   4. File > Share > Publish to web (entire document, CSV) — then run
 *      logPublishInfo() to get the gid= values for the backend .env.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

var DK_SPLITS_URL = 'https://dknetwork.draftkings.com/draftkings-sportsbook-betting-splits/';

// tb_eg values come from the sport <select> on the DK Network splits page.
var LEAGUES = [
  { league: 'NFL',   eventGroup: '88808', sheetName: 'NFL' },
  { league: 'NCAAF', eventGroup: '87637', sheetName: 'NCAAF' },
  { league: 'NBA',   eventGroup: '42648', sheetName: 'NBA' },
  { league: 'NCAAB', eventGroup: '92483', sheetName: 'NCAAB' },
  { league: 'MLB',   eventGroup: '84240', sheetName: 'MLB' },
  { league: 'NHL',   eventGroup: '42133', sheetName: 'NHL' },
];

var HEADER = ['Matchup', 'Game Time ET', 'Market', 'Selection', 'Odds', 'Handle %', 'Bets %', 'Diff', 'Flag'];

// The DK splits table paginates at 10 games per page (?tb_page=N). A full MLB
// day alone is ~15 games, so every page must be fetched. Safety cap on pages
// per league in case the pager markup ever changes.
var MAX_PAGES_PER_LEAGUE = 15;

var FETCH_OPTIONS = {
  muteHttpExceptions: true,
  followRedirects: true,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  },
};

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/** Scrape every league and rewrite its sheet tab. Run this hourly. */
function updateAllSplits() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summary = [];

  for (var i = 0; i < LEAGUES.length; i++) {
    var cfg = LEAGUES[i];
    var result;
    try {
      result = fetchLeagueRows(cfg, new Date());
    } catch (e) {
      // Leave the tab's existing data alone if the fetch/parse fails —
      // stale odds beat an empty sheet mid-slate.
      summary.push(cfg.league + ': ERROR ' + e.message + ' (tab left unchanged)');
      continue;
    }

    writeLeagueSheet(ss, cfg.sheetName, result.rows);
    summary.push(cfg.league + ': ' + result.rows.length + ' rows (' + result.pages + ' page' + (result.pages === 1 ? '' : 's') + ')');
  }

  Logger.log('updateAllSplits finished — ' + summary.join(' | '));
}

/** Create (or reset) the hourly refresh trigger. Run once. */
function setupHourlyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'updateAllSplits') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('updateAllSplits').timeBased().everyHours(1).create();
  Logger.log('Hourly trigger installed for updateAllSplits.');
}

/** Log the gid of every league tab + the .env lines the backend needs. */
function logPublishInfo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lines = [
    'Spreadsheet ID: ' + ss.getId(),
    '',
    '1) File > Share > Publish to web > Entire document as CSV, then copy the',
    '   published base URL (it looks like:',
    '   https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?)',
    '   and set GOOGLE_SHEETS_BASE_URL to everything up to and including "pub?".',
    '   The backend appends "output=csv&single=true&gid=<gid>" itself.',
    '',
    '2) Backend .env gid values:',
  ];
  for (var i = 0; i < LEAGUES.length; i++) {
    var sheet = ss.getSheetByName(LEAGUES[i].sheetName);
    if (sheet) {
      lines.push(LEAGUES[i].league.toLowerCase() + '_gid=' + sheet.getSheetId());
    }
  }
  Logger.log(lines.join('\n'));
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

/**
 * Fetch every page of a league's splits table and merge the rows.
 *
 * Stops when the page's pager has no link to the next page (the last page
 * never mentions tb_page=N+1), or at MAX_PAGES_PER_LEAGUE as a safety cap.
 * Rows are deduped on (matchup, time, market, selection) in case a game
 * shifts between pages mid-crawl.
 *
 * @return {{rows: Array<Array<string>>, pages: number}}
 */
function fetchLeagueRows(cfg, now) {
  var rows = [];
  var seen = {};
  var page = 1;

  for (; page <= MAX_PAGES_PER_LEAGUE; page++) {
    var url = DK_SPLITS_URL + '?tb_eg=' + cfg.eventGroup + '&tb_edate=n30days&tb_page=' + page;
    var resp = UrlFetchApp.fetch(url, FETCH_OPTIONS);
    if (resp.getResponseCode() !== 200) {
      throw new Error('HTTP ' + resp.getResponseCode() + ' on page ' + page);
    }
    var html = resp.getContentText();

    var pageRows = parseSplitsPage(html, now);
    for (var i = 0; i < pageRows.length; i++) {
      var r = pageRows[i];
      var key = r[0] + '|' + r[1] + '|' + r[2] + '|' + r[3];
      if (seen[key]) continue;
      seen[key] = true;
      rows.push(r);
    }

    if (html.indexOf('tb_page=' + (page + 1)) === -1) break;
  }

  return { rows: rows, pages: Math.min(page, MAX_PAGES_PER_LEAGUE) };
}

// ---------------------------------------------------------------------------
// Sheet writing
// ---------------------------------------------------------------------------

function writeLeagueSheet(ss, sheetName, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clearContents();

  var values = [HEADER].concat(rows);
  // Force plain-text so Sheets doesn't mangle "+163" into 163 or "65%" into 0.65
  var range = sheet.getRange(1, 1, values.length, HEADER.length);
  range.setNumberFormat('@');
  range.setValues(values);
}

// ---------------------------------------------------------------------------
// Parsing (pure functions — unit-testable outside Apps Script)
// ---------------------------------------------------------------------------

/**
 * Parse a DK Network betting-splits page into sheet rows.
 * @param {string} html full page HTML
 * @param {Date} now used to infer the year for game dates
 * @return {Array<Array<string>>} rows in HEADER order
 */
function parseSplitsPage(html, now) {
  var rows = [];

  // Focus on the splits table wrapper to skip unrelated page markup.
  var tableStart = html.indexOf('id="tbsedid"');
  var body = tableStart >= 0 ? html.slice(tableStart) : html;

  // Locate each game block by its title/time header.
  var gameRe = /tb-se-title[\s\S]*?<a[^>]*>\s*([\s\S]*?)\s*<\/a>[\s\S]*?<span>\s*([^<]*?)\s*<\/span>/g;
  var games = [];
  var m;
  while ((m = gameRe.exec(body)) !== null) {
    games.push({ title: cleanText(m[1]), time: cleanText(m[2]), start: m.index });
  }

  for (var g = 0; g < games.length; g++) {
    var game = games[g];
    var end = g + 1 < games.length ? games[g + 1].start : body.length;
    var slice = body.slice(game.start, end);

    // Only two-team "AWAY @ HOME" games (skips soccer "X vs Y" style titles).
    var teams = game.title.split(' @ ');
    if (teams.length !== 2) continue;

    var gameTimeEt = formatGameTimeEt(game.time, now);
    if (!gameTimeEt) continue;

    // Market sections within the game block.
    var marketRe = /tb-se-head">\s*<div>\s*([^<]+?)\s*<\/div>/g;
    var markets = [];
    var mm;
    while ((mm = marketRe.exec(slice)) !== null) {
      markets.push({ name: normalizeMarket(mm[1]), start: mm.index });
    }

    for (var k = 0; k < markets.length; k++) {
      var market = markets[k];
      if (!market.name) continue; // unsupported market type
      var mEnd = k + 1 < markets.length ? markets[k + 1].start : slice.length;
      var selections = parseMarketSelections(slice.slice(market.start, mEnd));

      for (var s = 0; s < selections.length; s++) {
        var sel = selections[s];
        rows.push([
          game.title,
          gameTimeEt,
          market.name,
          sel.selection,
          sel.odds,
          sel.handlePct + '%',
          sel.betsPct + '%',
          round1(sel.handlePct - sel.betsPct) + '%',
          '',
        ]);
      }
    }
  }

  return rows;
}

/** Parse the tb-sodd selection entries inside one market section. */
function parseMarketSelections(sectionHtml) {
  var out = [];
  var chunks = sectionHtml.split('class="tb-sodd"').slice(1);

  for (var i = 0; i < chunks.length; i++) {
    var chunk = chunks[i];

    var selMatch = /tb-slipline">\s*([\s\S]*?)\s*<\/div>/.exec(chunk);
    var oddsMatch = /tb-odd-s"[^>]*>\s*([\s\S]*?)\s*<\/a>/.exec(chunk);
    if (!selMatch || !oddsMatch) continue;

    var pcts = [];
    var pctRe = /(-?[\d.]+)\s*%\s*<div class="tb-progress"/g;
    var pm;
    while ((pm = pctRe.exec(chunk)) !== null && pcts.length < 2) {
      pcts.push(parseFloat(pm[1]));
    }
    if (pcts.length !== 2) continue;

    out.push({
      selection: normalizeSigns(cleanText(selMatch[1])),
      odds: normalizeSigns(cleanText(oddsMatch[1])),
      handlePct: pcts[0], // column order on the page: Odds | % Handle | % Bets
      betsPct: pcts[1],
    });
  }

  return out;
}

/** Map DK market names onto the backend's three markets; null = skip. */
function normalizeMarket(name) {
  var n = cleanText(name).toLowerCase();
  if (n === 'moneyline') return 'Moneyline';
  if (n === 'spread' || n === 'run line' || n === 'puck line') return 'Spread';
  if (n === 'total') return 'Total';
  return null;
}

/**
 * "7/11, 12:05PM" -> "2026-07-11T12:05" (ET wall-clock, year inferred).
 * The output must contain no "/" (Firestore doc IDs) and no "_" (the backend
 * splits doc IDs on underscores).
 */
function formatGameTimeEt(raw, now) {
  var m = /(\d{1,2})\/(\d{1,2}),?\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(raw);
  if (!m) return null;

  var month = parseInt(m[1], 10);
  var day = parseInt(m[2], 10);
  var hour = parseInt(m[3], 10) % 12;
  if (m[5].toUpperCase() === 'PM') hour += 12;

  // DK omits the year, and the page only lists upcoming (next ~30 days) games.
  // A date that would land more than ~2 days in the past therefore belongs to
  // next year (Dec -> Jan rollover); the small buffer tolerates live games.
  var year = now.getFullYear();
  var candidate = new Date(year, month - 1, day);
  if (now.getTime() - candidate.getTime() > 2 * 24 * 3600 * 1000) {
    year += 1;
  }

  return year + '-' + pad2(month) + '-' + pad2(day) + 'T' + pad2(hour) + ':' + pad2(parseInt(m[4], 10));
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function cleanText(s) {
  return String(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** DK renders negative odds with U+2212 (−); the backend expects ASCII "-". */
function normalizeSigns(s) {
  return s.replace(/−|&minus;|&#8722;/g, '-');
}

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

function round1(x) {
  return Math.round(x * 10) / 10;
}

// Export for Node-based tests; ignored inside Apps Script.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseSplitsPage: parseSplitsPage,
    parseMarketSelections: parseMarketSelections,
    normalizeMarket: normalizeMarket,
    formatGameTimeEt: formatGameTimeEt,
    normalizeSigns: normalizeSigns,
    LEAGUES: LEAGUES,
    HEADER: HEADER,
  };
}
