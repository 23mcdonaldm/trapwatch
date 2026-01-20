import { Game, Team, League, TrapLabel, LEAGUE_MAP, TRAP_STATUS_MAP, ApiGame, ApiFeedResponse, ApiStatusFactors, ApiOddsSide, Trigger } from '../types';
import { NFL_TEAMS, NBA_TEAMS, NHL_TEAMS, MLB_TEAMS, NCAA_TEAMS } from '../data/teams';

// Helper to find team by name (fuzzy matching)
const findTeamByName = (teamName: string, league: League): Team | null => {
  let teams: Record<string, Team> | undefined;
  
  switch (league) {
    case League.NFL:
      teams = NFL_TEAMS;
      break;
    case League.NBA:
      teams = NBA_TEAMS;
      break;
    case League.NHL:
      teams = NHL_TEAMS;
      break;
    case League.MLB:
      teams = MLB_TEAMS;
      break;
    case League.NCAAF:
    case League.NCAAB:
      teams = NCAA_TEAMS;
      break;
    default:
      return null;
  }

  if (!teams) return null;

  // Try exact match first
  for (const [key, team] of Object.entries(teams)) {
    if (team.name.toLowerCase() === teamName.toLowerCase() || 
        team.shortName.toLowerCase() === teamName.toLowerCase()) {
      return team;
    }
  }

  // Try partial match
  const lowerName = teamName.toLowerCase();
  for (const [key, team] of Object.entries(teams)) {
    if (team.name.toLowerCase().includes(lowerName) || 
        team.shortName.toLowerCase().includes(lowerName) ||
        lowerName.includes(team.name.toLowerCase()) ||
        lowerName.includes(team.shortName.toLowerCase())) {
      return team;
    }
  }

  return null;
};

// Create a default team object if not found
const createDefaultTeam = (teamName: string): Team => {
  return {
    name: teamName,
    shortName: teamName.length > 15 ? teamName.substring(0, 15) + '...' : teamName,
    logoUrl: `https://a.espncdn.com/i/teamlogos/default-team-logo-500.png`,
    primaryColor: '#64748b',
  };
};

// Convert API odds number to string format (e.g., -340, +270)
const formatOdds = (odds: number): string => {
  return odds > 0 ? `+${odds}` : `${odds}`;
};

// Parse gameTimeET to ISO string
const parseGameTime = (gameTimeET: string): string => {
  // Format: "2026-01-20 10:10PM ET" or "2026-01-20 07:00PM ET"
  try {
    // Remove " ET" suffix
    const timeStr = gameTimeET.replace(' ET', '').trim();
    // Parse the date and time
    const parts = timeStr.split(' ');
    if (parts.length < 2) {
      throw new Error('Invalid format - missing time');
    }
    
    const datePart = parts[0]; // "2026-01-20" (YYYY-MM-DD format)
    const timePart = parts.slice(1).join(' '); // "10:10PM" or "07:00PM"
    
    // Date is in YYYY-MM-DD format
    const dateParts = datePart.split('-');
    if (dateParts.length !== 3) {
      throw new Error('Invalid date format');
    }
    
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);
    const day = parseInt(dateParts[2]);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new Error('Invalid date values');
    }
    
    // Parse time (handles both "10:10PM" and "07:00PM")
    const timeMatch = timePart.match(/(\d+):(\d+)(AM|PM)/i);
    
    if (!timeMatch) {
      throw new Error('Invalid time format');
    }
    
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const ampm = timeMatch[3].toUpperCase();
    
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error('Invalid time values');
    }
    
    // Convert to 24-hour format
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    // Create date in ET timezone (UTC-5)
    // ET is UTC-5, so we create the date as UTC and subtract 5 hours
    // This represents the ET time as if it were UTC
    const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    // Adjust for ET (UTC-5) - subtract 5 hours to convert ET to UTC
    date.setUTCHours(date.getUTCHours() - 5);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date created');
    }
    
    return date.toISOString();
  } catch (e) {
    console.warn('Failed to parse gameTimeET:', gameTimeET, e);
    // Fallback to current time
    return new Date().toISOString();
  }
};

// Get which market has a specific status (priority: Moneyline > Spread > Total)
const getMarketForStatus = (apiGame: ApiGame, status: 'TC' | 'TD' | 'TP'): 'Moneyline' | 'Spread' | 'Total' | null => {
  const mlStatus = apiGame.currentOdds.Moneyline?.Status;
  const spreadStatus = apiGame.currentOdds.Spread?.Status;
  const totalStatus = apiGame.currentOdds.Total?.Status;
  
  if (mlStatus === status) return 'Moneyline';
  if (spreadStatus === status) return 'Spread';
  if (totalStatus === status) return 'Total';
  
  return null;
};

// Determine trap label and which market triggered it (highest priority)
const getTrapLabelAndMarket = (apiGame: ApiGame): { label: TrapLabel; market: 'Moneyline' | 'Spread' | 'Total' } => {
  // Priority: TC > TD > TP, and check which market has it
  // Priority order: Moneyline > Spread > Total
  const tcMarket = getMarketForStatus(apiGame, 'TC');
  if (tcMarket) return { label: TrapLabel.CITY, market: tcMarket };
  
  const tdMarket = getMarketForStatus(apiGame, 'TD');
  if (tdMarket) return { label: TrapLabel.DETECTED, market: tdMarket };
  
  const tpMarket = getMarketForStatus(apiGame, 'TP');
  if (tpMarket) return { label: TrapLabel.POTENTIAL, market: tpMarket };
  
  // Default fallback
  return { label: TrapLabel.POTENTIAL, market: 'Moneyline' };
};

// Calculate severity score based on diff values
const calculateSeverityScore = (apiGame: ApiGame): number => {
  const mlDiff = apiGame.currentOdds.Moneyline?.Away?.diff || apiGame.currentOdds.Moneyline?.Home?.diff || 0;
  const spreadDiff = apiGame.currentOdds.Spread?.Away?.diff || apiGame.currentOdds.Spread?.Home?.diff || 0;
  const maxDiff = Math.max(mlDiff, spreadDiff);
  
  // Scale 0-50 diff to 0-100 score, with bonus for TC status
  let score = Math.min(100, (maxDiff / 50) * 100);
  
  const { label: trapLabel } = getTrapLabelAndMarket(apiGame);
  if (trapLabel === TrapLabel.CITY) score = Math.min(100, score + 20);
  else if (trapLabel === TrapLabel.DETECTED) score = Math.min(100, score + 10);
  
  return Math.round(score);
};

// Determine if home team is favorite based on moneyline odds
const isHomeFavorite = (apiGame: ApiGame): boolean => {
  const homeOdds = apiGame.currentOdds.Moneyline?.Home?.odds || 0;
  const awayOdds = apiGame.currentOdds.Moneyline?.Away?.odds || 0;
  
  // Lower odds (more negative or less positive) = favorite
  return homeOdds < awayOdds;
};

// Generate triggers from StatusFactors and market data
const generateTriggers = (
  statusFactors: ApiStatusFactors | undefined,
  market: 'Moneyline' | 'Spread' | 'Total',
  trapSide: ApiOddsSide,
  trapLabel: TrapLabel
): Trigger[] => {
  const triggers: Trigger[] = [];
  
  // Calculate the actual diff (difference between handle and bets percentages)
  const diff = Math.abs(trapSide.handlePct - trapSide.betsPct);
  
  // If diff is significant, create a trigger about sharp vs public money
  if (diff >= 10) {
    const isHandleHigher = trapSide.handlePct > trapSide.betsPct;
    
    let title: string;
    let explanation: string;
    
    if (isHandleHigher) {
      // More money (handle) than tickets (bets) = sharps betting heavy
      title = 'Sharp Money Discrepancy';
      explanation = `Sharp bettors are placing significantly more money (${Math.round(trapSide.handlePct)}%) than the public ticket count (${Math.round(trapSide.betsPct)}%) suggests. This ${diff}% gap indicates professional money is heavily backing this side, creating a trap as the public follows ticket percentages while sharps control the actual money flow.`;
    } else {
      // More tickets (bets) than money (handle) = public betting tickets, sharps fading
      title = 'Public Ticket Overload';
      explanation = `The public is placing more tickets (${Math.round(trapSide.betsPct)}%) than the money percentage (${Math.round(trapSide.handlePct)}%) indicates. This ${diff}% difference shows many small public bets vs fewer but larger sharp bets on the opposite side, signaling a potential trap where public sentiment doesn't match where the real money is going.`;
    }
    
    triggers.push({ title, explanation });
  }
  
  // Add market-specific triggers based on trap label
  if (market === 'Moneyline') {
    if (trapLabel === TrapLabel.CITY) {
      triggers.push({
        title: 'Moneyline Trap City',
        explanation: 'Extreme public money concentration on the moneyline favorite. When over 85% of handle is on one side, favorites cover less than 40% of the time, making this a high-confidence trap signal.'
      });
    } else if (trapLabel === TrapLabel.DETECTED) {
      triggers.push({
        title: 'Moneyline Trap Detected',
        explanation: 'Significant public money imbalance detected on the moneyline. Sharp money is likely positioned on the opposite side, creating value on the underdog.'
      });
    }
  } else if (market === 'Spread') {
    if (trapLabel === TrapLabel.CITY) {
      triggers.push({
        title: 'Spread Trap City',
        explanation: 'Massive public support on the spread favorite. When public bets exceed 80% on a spread, sharp contrarian plays become highly profitable as books shade lines toward public action.'
      });
    } else if (trapLabel === TrapLabel.DETECTED) {
      triggers.push({
        title: 'Spread Trap Detected',
        explanation: 'Public is heavily backing one side of the spread. The discrepancy between ticket count and money percentage suggests sharp action on the opposite side.'
      });
    }
  } else if (market === 'Total') {
    if (trapLabel === TrapLabel.CITY) {
      triggers.push({
        title: 'Total Trap City',
        explanation: 'Extreme public concentration on Over/Under. When public money heavily favors one side of the total, sharp bettors often find value on the opposite side, especially in games with key player situations or weather factors.'
      });
    } else if (trapLabel === TrapLabel.DETECTED) {
      triggers.push({
        title: 'Total Trap Detected',
        explanation: 'Significant public bias detected on the total. The money vs ticket discrepancy indicates sharp action may be positioned contrarian to public sentiment.'
      });
    }
  }
  
  return triggers;
};

// Map API game to frontend Game type
export const mapApiGameToGame = (apiGame: ApiGame, forceStatus?: 'TC' | 'TD' | 'TP', forceMarket?: 'Moneyline' | 'Spread' | 'Total'): Game => {
  const league = LEAGUE_MAP[apiGame.league] || League.NFL;
  
  // Get or create team objects
  const homeTeamData = findTeamByName(apiGame.homeTeam, league) || createDefaultTeam(apiGame.homeTeam);
  const awayTeamData = findTeamByName(apiGame.awayTeam, league) || createDefaultTeam(apiGame.awayTeam);
  
  // Determine trap label and market
  let trapLabel: TrapLabel;
  let trapMarket: 'Moneyline' | 'Spread' | 'Total';
  
  if (forceStatus && forceMarket) {
    // Use forced status and market
    trapMarket = forceMarket;
    trapLabel = forceStatus === 'TC' ? TrapLabel.CITY : forceStatus === 'TD' ? TrapLabel.DETECTED : TrapLabel.POTENTIAL;
  } else {
    // Use default logic (highest priority)
    const result = getTrapLabelAndMarket(apiGame);
    trapLabel = result.label;
    trapMarket = result.market;
  }
  
  // Extract StatusFactors from the market that has the trap
  let statusFactors: ApiStatusFactors | undefined;
  let trapSide: ApiOddsSide;
  
  // Extract odds based on which market has the trap
  let spread: string | undefined;
  let moneyline: string | undefined;
  let total: string | undefined;
  let publicMoneyPercent: number;
  let publicBetsPercent: number;
  let trapIsOnHome: boolean;
  
  if (trapMarket === 'Moneyline') {
    // Determine which side has the trap (high public money/bets percentage)
    const homeMoneyPct = apiGame.currentOdds.Moneyline.Home.handlePct;
    const awayMoneyPct = apiGame.currentOdds.Moneyline.Away.handlePct;
    const homeBetsPct = apiGame.currentOdds.Moneyline.Home.betsPct;
    const awayBetsPct = apiGame.currentOdds.Moneyline.Away.betsPct;
    
    trapIsOnHome = homeMoneyPct > awayMoneyPct || (homeMoneyPct === awayMoneyPct && homeBetsPct > awayBetsPct);
    
    trapSide = trapIsOnHome 
      ? apiGame.currentOdds.Moneyline.Home 
      : apiGame.currentOdds.Moneyline.Away;
    
    statusFactors = apiGame.currentOdds.Moneyline.StatusFactors;
    moneyline = formatOdds(trapSide.odds);
    publicMoneyPercent = Math.round(trapSide.handlePct);
    publicBetsPercent = Math.round(trapSide.betsPct);
    
    // Also include spread for reference
    const spreadLine = apiGame.currentOdds.Spread.Line;
    if (trapIsOnHome) {
      spread = spreadLine < 0 ? `${spreadLine}` : `+${spreadLine}`;
    } else {
      spread = spreadLine < 0 ? `+${Math.abs(spreadLine)}` : `-${spreadLine}`;
    }
    
    if (apiGame.currentOdds.Total?.Line) {
      total = apiGame.currentOdds.Total.Line.toString();
    }
    
  } else if (trapMarket === 'Spread') {
    // Determine which side has the trap on spread
    const homeSpreadPct = apiGame.currentOdds.Spread.Home.handlePct;
    const awaySpreadPct = apiGame.currentOdds.Spread.Away.handlePct;
    const homeBetsPct = apiGame.currentOdds.Spread.Home.betsPct;
    const awayBetsPct = apiGame.currentOdds.Spread.Away.betsPct;
    
    trapIsOnHome = homeSpreadPct > awaySpreadPct || (homeSpreadPct === awaySpreadPct && homeBetsPct > awayBetsPct);
    
    const spreadLine = apiGame.currentOdds.Spread.Line;
    if (trapIsOnHome) {
      spread = spreadLine < 0 ? `${spreadLine}` : `+${spreadLine}`;
    } else {
      spread = spreadLine < 0 ? `+${Math.abs(spreadLine)}` : `-${spreadLine}`;
    }
    
    trapSide = trapIsOnHome 
      ? apiGame.currentOdds.Spread.Home 
      : apiGame.currentOdds.Spread.Away;
    
    statusFactors = apiGame.currentOdds.Spread.StatusFactors;
    publicMoneyPercent = Math.round(trapSide.handlePct);
    publicBetsPercent = Math.round(trapSide.betsPct);
    
    // Also include moneyline for reference
    const homeML = apiGame.currentOdds.Moneyline.Home.odds;
    const awayML = apiGame.currentOdds.Moneyline.Away.odds;
    moneyline = formatOdds(trapIsOnHome ? homeML : awayML);
    
    if (apiGame.currentOdds.Total?.Line) {
      total = apiGame.currentOdds.Total.Line.toString();
    }
    
  } else if (trapMarket === 'Total') {
    // Determine which side has the trap on total (Over or Under)
    const overPct = apiGame.currentOdds.Total.Over.handlePct;
    const underPct = apiGame.currentOdds.Total.Under.handlePct;
    const overBetsPct = apiGame.currentOdds.Total.Over.betsPct;
    const underBetsPct = apiGame.currentOdds.Total.Under.betsPct;
    
    const trapIsOnOver = overPct > underPct || (overPct === underPct && overBetsPct > underBetsPct);
    
    trapSide = trapIsOnOver 
      ? apiGame.currentOdds.Total.Over 
      : apiGame.currentOdds.Total.Under;
    
    statusFactors = apiGame.currentOdds.Total?.StatusFactors;
    total = apiGame.currentOdds.Total.Line.toString();
    publicMoneyPercent = Math.round(trapSide.handlePct);
    publicBetsPercent = Math.round(trapSide.betsPct);
    
    // For total, trapIsOnHome doesn't really apply, but we'll use it for consistency
    // Use moneyline to determine which team is "home" for display purposes
    const homeMoneyPct = apiGame.currentOdds.Moneyline.Home.handlePct;
    const awayMoneyPct = apiGame.currentOdds.Moneyline.Away.handlePct;
    trapIsOnHome = homeMoneyPct > awayMoneyPct;
    
    // Also include moneyline and spread for reference
    const homeML = apiGame.currentOdds.Moneyline.Home.odds;
    const awayML = apiGame.currentOdds.Moneyline.Away.odds;
    moneyline = formatOdds(trapIsOnHome ? homeML : awayML);
    
    const spreadLine = apiGame.currentOdds.Spread.Line;
    if (trapIsOnHome) {
      spread = spreadLine < 0 ? `${spreadLine}` : `+${spreadLine}`;
    } else {
      spread = spreadLine < 0 ? `+${Math.abs(spreadLine)}` : `-${spreadLine}`;
    }
  } else {
    // Fallback (shouldn't happen)
    trapIsOnHome = true;
    moneyline = formatOdds(apiGame.currentOdds.Moneyline.Home.odds);
    publicMoneyPercent = 0;
    publicBetsPercent = 0;
  }
  
  return {
    id: apiGame.id,
    league,
    startTime: parseGameTime(apiGame.gameTimeET),
    homeTeam: homeTeamData,
    awayTeam: awayTeamData,
    isHomeFavorite: trapIsOnHome,
    odds: {
      spread,
      moneyline,
      total,
    },
    publicMoneyPercent,
    publicBetsPercent,
    trapLabel,
    trapMarket,
    severityScore: calculateSeverityScore(apiGame),
    trapTriggers: generateTriggers(statusFactors, trapMarket, trapSide, trapLabel),
    whatPeopleAreSaying: [], // Will be populated later or from another endpoint
    trapHistory: [{
      label: trapLabel,
      timestamp: apiGame.lastUpdatedAt,
    }],
  };
};

// Map API feed response to grouped Games by trap label
export const mapApiFeedToGames = (apiFeed: ApiFeedResponse): {
  [TrapLabel.CITY]: Game[];
  [TrapLabel.DETECTED]: Game[];
  [TrapLabel.POTENTIAL]: Game[];
} => {
  // Combine all games from all buckets and remove duplicates
  const allApiGames = [
    ...apiFeed.traps.TC,
    ...apiFeed.traps.TD,
    ...apiFeed.traps.TP,
  ];
  
  // Build a map to track which games are in which buckets
  const gameBuckets = new Map<string, Set<string>>();
  for (const game of apiFeed.traps.TC) {
    if (!gameBuckets.has(game.id)) {
      gameBuckets.set(game.id, new Set());
    }
    gameBuckets.get(game.id)!.add('TC');
  }
  for (const game of apiFeed.traps.TD) {
    if (!gameBuckets.has(game.id)) {
      gameBuckets.set(game.id, new Set());
    }
    gameBuckets.get(game.id)!.add('TD');
  }
  for (const game of apiFeed.traps.TP) {
    if (!gameBuckets.has(game.id)) {
      gameBuckets.set(game.id, new Set());
    }
    gameBuckets.get(game.id)!.add('TP');
  }
  
  // Get unique games, preferring from TC > TD > TP buckets
  const uniqueGames = new Map<string, ApiGame>();
  // First add all TC games
  for (const game of apiFeed.traps.TC) {
    uniqueGames.set(game.id, game);
  }
  // Then add TD games (if not already in)
  for (const game of apiFeed.traps.TD) {
    if (!uniqueGames.has(game.id)) {
      uniqueGames.set(game.id, game);
    }
  }
  // Finally add TP games (if not already in)
  for (const game of apiFeed.traps.TP) {
    if (!uniqueGames.has(game.id)) {
      uniqueGames.set(game.id, game);
    }
  }
  
  // Map all games - map each game once but group by all statuses it has
  const mappedGamesMap = new Map<string, Game>();
  
  Array.from(uniqueGames.values()).forEach(apiGame => {
    try {
      const mapped = mapApiGameToGame(apiGame);
      mappedGamesMap.set(mapped.id, mapped);
    } catch (error) {
      console.error('Error mapping game:', apiGame.id, apiGame.homeTeam, apiGame.awayTeam, error);
    }
  });
  
  const mappedGames = Array.from(mappedGamesMap.values());
  
  // Helper function to recreate game with market data for a specific status
  const createGameForStatus = (game: Game, apiGame: ApiGame, status: 'TC' | 'TD' | 'TP'): Game => {
    const marketForStatus = getMarketForStatus(apiGame, status);
    if (!marketForStatus) {
      // No market with this status (shouldn't happen, but safety check)
      return game;
    }
    
    // Recreate game with the correct market data for this status
    return mapApiGameToGame(apiGame, status, marketForStatus);
  };
  
  // Group games by all statuses they have (not just the highest priority)
  // Use the backend buckets to determine which sections games should appear in
  const cityGames: Game[] = [];
  const detectedGames: Game[] = [];
  const potentialGames: Game[] = [];
  
  mappedGames.forEach(game => {
    // Check which buckets this game was in from the backend
    const apiGame = uniqueGames.get(game.id);
    if (apiGame) {
      const inBuckets = gameBuckets.get(game.id) || new Set();
      
      // Add to all sections where it has that status, with the correct market for that status
      if (inBuckets.has('TC')) {
        const marketForTC = getMarketForStatus(apiGame, 'TC');
        if (marketForTC) {
          const gameForTC = createGameForStatus(game, apiGame, 'TC');
          cityGames.push(gameForTC);
        }
      }
      if (inBuckets.has('TD')) {
        const marketForTD = getMarketForStatus(apiGame, 'TD');
        if (marketForTD) {
          const gameForTD = createGameForStatus(game, apiGame, 'TD');
          detectedGames.push(gameForTD);
        }
      }
      if (inBuckets.has('TP')) {
        const marketForTP = getMarketForStatus(apiGame, 'TP');
        if (marketForTP) {
          const gameForTP = createGameForStatus(game, apiGame, 'TP');
          potentialGames.push(gameForTP);
        }
      }
    }
  });
  
  // Group by backend buckets (which represent all statuses the game has)
  return {
    [TrapLabel.CITY]: cityGames,
    [TrapLabel.DETECTED]: detectedGames,
    [TrapLabel.POTENTIAL]: potentialGames,
  };
};
