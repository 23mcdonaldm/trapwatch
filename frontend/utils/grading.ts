// Frontend mirror of backend/src/main/service/results_service.py grading rules.
// Used only for display (W/L/P chips on completed games) — the graded source of
// truth lives in Firestore (trap_results / user_picks). Keep in sync with backend.

export type MarketWinner = 'home' | 'away' | 'over' | 'under' | 'push';
export type Outcome = 'win' | 'loss' | 'push';

/**
 * The winning side of a market. Spread line is from the HOME team's perspective.
 * Returns null when ungradable (missing line).
 */
export const winningSide = (
  market: 'Moneyline' | 'Spread' | 'Total',
  line: number | undefined,
  homeScore: number,
  awayScore: number
): MarketWinner | null => {
  if (market === 'Moneyline') {
    if (homeScore > awayScore) return 'home';
    if (awayScore > homeScore) return 'away';
    return 'push';
  }
  if (line === undefined) return null;
  if (market === 'Spread') {
    const adjusted = homeScore + line;
    if (adjusted > awayScore) return 'home';
    if (adjusted < awayScore) return 'away';
    return 'push';
  }
  // Total
  const total = homeScore + awayScore;
  if (total > line) return 'over';
  if (total < line) return 'under';
  return 'push';
};

/**
 * System outcome for a flagged market: the flag's side marks the PUBLIC side,
 * and the system WINS when that side LOSES. Push stays push.
 */
export const systemOutcome = (
  trapSide: 'Home' | 'Away' | 'Over' | 'Under',
  winner: MarketWinner
): Outcome => {
  if (winner === 'push') return 'push';
  return trapSide.toLowerCase() === winner ? 'loss' : 'win';
};
