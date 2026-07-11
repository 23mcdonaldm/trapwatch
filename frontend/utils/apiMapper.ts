import { Game, Team, League, TrapLabel, LEAGUE_MAP, TRAP_STATUS_MAP, Trigger } from '../types';
import { ApiGame, ApiFeedResponse, ApiStatusFactors, ApiOddsSide, ApiTrapEntry } from '@/types/odds';
import { NFL_TEAMS, NBA_TEAMS, NHL_TEAMS, MLB_TEAMS, NCAA_TEAMS } from '../data/teams';

// Helper to normalize team names for matching (remove spaces, special chars, lowercase)
const normalizeName = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Helper to find team by name (simple fuzzy matching)
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

  const normalizedSearch = normalizeName(teamName);
  const matches: Team[] = [];

  for (const [key, team] of Object.entries(teams)) {
    const normalizedName = normalizeName(team.name);
    const normalizedShort = normalizeName(team.shortName);
    const normalizedAliases = (team.aliases || []).map(normalizeName);
    
    // Exact match - return immediately
    if (normalizedName === normalizedSearch || 
        normalizedShort === normalizedSearch ||
        normalizedAliases.includes(normalizedSearch)) {
      return team;
    }
    
    // Partial match - collect all matches
    if (normalizedName.includes(normalizedSearch) || 
        normalizedSearch.includes(normalizedName) ||
        normalizedShort.includes(normalizedSearch) ||
        normalizedSearch.includes(normalizedShort) ||
        normalizedAliases.some(alias => alias.includes(normalizedSearch) || normalizedSearch.includes(alias))) {
      matches.push(team);
    }
  }
  
  // Return the longest/most specific match (most characters in name)
  if (matches.length > 0) {
    matches.sort((a, b) => b.name.length - a.name.length);
    return matches[0];
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

// Format spread line based on trap side
// Line is always from home team's perspective:
// - Negative = home favored (e.g., -3.5)
// - Positive = home underdog (e.g., +3.5)
// If trap is on Away, flip the sign
const formatSpreadLine = (line: number, trapSide: 'Home' | 'Away'): string => {
  if (trapSide === 'Home') {
    // Show line as-is (negative if home favored, positive if home underdog)
    return line < 0 ? `${line}` : `+${line}`;
  } else {
    // Trap is on Away, flip the sign
    return line < 0 ? `+${Math.abs(line)}` : `${-line}`;
  }
};

// Calculate severity score based on diff values from the trap side
const calculateSeverityScore = (
  trapSide: ApiOddsSide,
  trapLabel: TrapLabel
): number => {
  const diff = trapSide.diff || 0;
  
  // Scale 0-50 diff to 0-100 score, with bonus for trap label
  let score = Math.min(100, (diff / 50) * 100);
  
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

// Generate triggers from StatusFactors for favorite and opposite sides
const generateTriggers = (
  statusFactors: ApiStatusFactors | undefined,
  market: 'Moneyline' | 'Spread' | 'Total',
  trapSide: ApiOddsSide,
  trapLabel: TrapLabel,
  trapSideKey: 'Home' | 'Away' | 'Over' | 'Under',
  isHomeFavorite: boolean,
  apiGame: ApiGame
): Trigger[] => {
  const triggers: Trigger[] = [];
  
  if (!statusFactors) return triggers;
  
  // Helper to get trend arrow based on status and whether it's favorite or opposite
  // status: TC, TD, or TP (first element)
  // isFromFavorite: true if the side (Home/Away) matches the favorite
  const getTrendArrow = (status: string, isFromFavorite: boolean): { direction: 'up' | 'down'; color: 'green' | 'orange' | 'yellow' | 'red' } => {
    const statusUpper = status.toUpperCase();
    if (isFromFavorite) {
      // Favorite side: up arrow, green/orange/yellow
      if (statusUpper === 'TC') return { direction: 'up', color: 'green' };
      if (statusUpper === 'TD') return { direction: 'up', color: 'orange' };
      return { direction: 'up', color: 'yellow' }; // TP
    } else {
      // Opposite side: down arrow, red/orange/yellow
      if (statusUpper === 'TC') return { direction: 'down', color: 'red' };
      if (statusUpper === 'TD') return { direction: 'down', color: 'orange' };
      return { direction: 'down', color: 'yellow' }; // TP
    }
  };
  
  // Process Diff factor
  // Format: [TC/TD/TP, Home/Away]
  if (statusFactors.Diff && Array.isArray(statusFactors.Diff) && statusFactors.Diff.length >= 2) {
    const [diffStatus, diffSide] = statusFactors.Diff;
    // diffSide is "Home" or "Away" - check if it matches the favorite
    const isFromFavorite = (diffSide === 'Home' && isHomeFavorite) || (diffSide === 'Away' && !isHomeFavorite);
    const trendArrow = getTrendArrow(diffStatus, isFromFavorite);
    
    triggers.push({
      title: 'Sharp Money Fading',
      explanation: `Sharp bettors are placing significantly more money than the public ticket count suggests. This gap indicates professional money is heavily backing ${isFromFavorite ? 'the favorite' : 'the opposite side'}, creating a trap as the public follows ticket percentages while sharps control the actual money flow.`,
      trendArrow
    });
  }
  
  // Process PublicMoney factor
  // Format: [TC/TD/TP, Home/Away]
  if (statusFactors.PublicMoney && Array.isArray(statusFactors.PublicMoney) && statusFactors.PublicMoney.length >= 2) {
    const [publicMoneyStatus, publicMoneySide] = statusFactors.PublicMoney;
    // publicMoneySide is "Home" or "Away" - check if it matches the favorite
    const isFromFavorite = (publicMoneySide === 'Home' && isHomeFavorite) || (publicMoneySide === 'Away' && !isHomeFavorite);
    const trendArrow = getTrendArrow(publicMoneyStatus, isFromFavorite);
    
    triggers.push({
      title: 'Public Ticket Overload',
      explanation: `The public is placing more tickets than the money percentage indicates. This difference shows many small public bets vs fewer but larger sharp bets on the opposite side, signaling a potential trap where public sentiment doesn't match where the real money is going.`,
      trendArrow
    });
  }
  
  return triggers;
};

// Map API trap entry to frontend Game type
export const mapTrapEntryToGame = (trapEntry: ApiTrapEntry): Game => {
  const { market, side, event: apiGame } = trapEntry;
  
  const league = LEAGUE_MAP[apiGame.league] || League.NFL;
  
  // Get or create team objects
  const homeTeamData = findTeamByName(apiGame.homeTeam, league) || createDefaultTeam(apiGame.homeTeam);
  const awayTeamData = findTeamByName(apiGame.awayTeam, league) || createDefaultTeam(apiGame.awayTeam);
  
  // Determine trap label from Status
  let trapLabel: TrapLabel;
  const status = apiGame.currentOdds[market]?.Status;
  if (status === 'TC') trapLabel = TrapLabel.CITY;
  else if (status === 'TD') trapLabel = TrapLabel.DETECTED;
  else trapLabel = TrapLabel.POTENTIAL;
  
  const trapMarket = market;
  
  // Extract trap side data and odds based on market and side
  let trapSide: ApiOddsSide;
  let statusFactors: ApiStatusFactors | undefined;
  let spread: string | undefined;
  let moneyline: string | undefined;
  let total: string | undefined;
  let totalOver: string | undefined;
  let totalUnder: string | undefined;
  let publicMoneyPercent: number;
  let publicBetsPercent: number;
  let trapIsOnHome: boolean;
  
  if (market === 'Moneyline') {
    trapIsOnHome = side === 'Home';
    trapSide = trapIsOnHome 
      ? apiGame.currentOdds.Moneyline.Home 
      : apiGame.currentOdds.Moneyline.Away;
    
    statusFactors = apiGame.currentOdds.Moneyline.StatusFactors;
    moneyline = formatOdds(trapSide.odds);
    publicMoneyPercent = Math.round(trapSide.handlePct);
    publicBetsPercent = Math.round(trapSide.betsPct);
    
    // Include spread for reference (formatted based on trap side)
    if (apiGame.currentOdds.Spread?.Line !== undefined) {
      spread = formatSpreadLine(apiGame.currentOdds.Spread.Line, side as 'Home' | 'Away');
    }
    
    // Include total for reference
    if (apiGame.currentOdds.Total?.Line !== undefined) {
      total = apiGame.currentOdds.Total.Line.toString();
      totalOver = formatOdds(apiGame.currentOdds.Total.Over.odds);
      totalUnder = formatOdds(apiGame.currentOdds.Total.Under.odds);
    }
    
  } else if (market === 'Spread') {
    trapIsOnHome = side === 'Home';
    trapSide = trapIsOnHome 
      ? apiGame.currentOdds.Spread.Home 
      : apiGame.currentOdds.Spread.Away;
    
    statusFactors = apiGame.currentOdds.Spread.StatusFactors;
    publicMoneyPercent = Math.round(trapSide.handlePct);
    publicBetsPercent = Math.round(trapSide.betsPct);
    
    // Format spread line based on trap side
    spread = formatSpreadLine(apiGame.currentOdds.Spread.Line, side as 'Home' | 'Away');
    
    // Include moneyline for reference (from trap side)
    const homeML = apiGame.currentOdds.Moneyline.Home.odds;
    const awayML = apiGame.currentOdds.Moneyline.Away.odds;
    moneyline = formatOdds(trapIsOnHome ? homeML : awayML);
    
    // Include total for reference
    if (apiGame.currentOdds.Total?.Line !== undefined) {
      total = apiGame.currentOdds.Total.Line.toString();
      totalOver = formatOdds(apiGame.currentOdds.Total.Over.odds);
      totalUnder = formatOdds(apiGame.currentOdds.Total.Under.odds);
    }
    
  } else if (market === 'Total') {
    // For Total, use moneyline to determine isHomeFavorite
    const homeML = apiGame.currentOdds.Moneyline.Home.odds;
    const awayML = apiGame.currentOdds.Moneyline.Away.odds;
    trapIsOnHome = homeML < awayML; // Lower odds = favorite
    
    trapSide = side === 'Over'
      ? apiGame.currentOdds.Total.Over 
      : apiGame.currentOdds.Total.Under;
    
    statusFactors = apiGame.currentOdds.Total?.StatusFactors;
    total = apiGame.currentOdds.Total.Line.toString();
    totalOver = formatOdds(apiGame.currentOdds.Total.Over.odds);
    totalUnder = formatOdds(apiGame.currentOdds.Total.Under.odds);
    publicMoneyPercent = Math.round(trapSide.handlePct);
    publicBetsPercent = Math.round(trapSide.betsPct);
    
    // Include moneyline and spread for reference
    moneyline = formatOdds(trapIsOnHome ? homeML : awayML);
    
    if (apiGame.currentOdds.Spread?.Line !== undefined) {
      spread = formatSpreadLine(apiGame.currentOdds.Spread.Line, trapIsOnHome ? 'Home' : 'Away');
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
      totalOver,
      totalUnder,
    },
    publicMoneyPercent,
    publicBetsPercent,
    trapLabel,
    trapMarket,
    trapSide: side as 'Home' | 'Away' | 'Over' | 'Under',
    severityScore: calculateSeverityScore(trapSide, trapLabel),
    trapTriggers: generateTriggers(statusFactors, trapMarket, trapSide, trapLabel, side, trapIsOnHome, apiGame),
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
  const cityGames: Game[] = [];
  const detectedGames: Game[] = [];
  const potentialGames: Game[] = [];
  
  // Map each trap entry directly - the backend already grouped them correctly
  apiFeed.traps.TC.forEach(trapEntry => {
    try {
      const game = mapTrapEntryToGame(trapEntry);
      cityGames.push(game);
    } catch (error) {
      console.error('Error mapping TC trap entry:', trapEntry.event.id, error);
    }
  });
  
  apiFeed.traps.TD.forEach(trapEntry => {
    try {
      const game = mapTrapEntryToGame(trapEntry);
      detectedGames.push(game);
    } catch (error) {
      console.error('Error mapping TD trap entry:', trapEntry.event.id, error);
    }
  });
  
  apiFeed.traps.TP.forEach(trapEntry => {
    try {
      const game = mapTrapEntryToGame(trapEntry);
      potentialGames.push(game);
        } catch (error) {
      console.error('Error mapping TP trap entry:', trapEntry.event.id, error);
        }
  });

  return {
    [TrapLabel.CITY]: cityGames,
    [TrapLabel.DETECTED]: detectedGames,
    [TrapLabel.POTENTIAL]: potentialGames,
  };
};