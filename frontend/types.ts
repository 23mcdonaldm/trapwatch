export enum League {
  NFL = 'NFL',
  NCAAF = 'NCAAF',
  NBA = 'NBA',
  NCAAB = 'NCAAB',
  MLB = 'MLB',
  NHL = 'NHL'
}

// Map API league strings to League enum
export const LEAGUE_MAP: Record<string, League> = {
  'americanfootballnfl': League.NFL,
  'americanfootballncaaf': League.NCAAF,
  'basketballnba': League.NBA,
  'basketballncaab': League.NCAAB,
  'baseballmlb': League.MLB,
  'icehockeynhl': League.NHL,
};

export enum TrapLabel {
  POTENTIAL = 'Trap Potential',
  DETECTED = 'Trap Detected',
  CITY = 'Trap City'
}

// Map API trap status to TrapLabel enum
export const TRAP_STATUS_MAP: Record<string, TrapLabel> = {
  'TP': TrapLabel.POTENTIAL,
  'TD': TrapLabel.DETECTED,
  'TC': TrapLabel.CITY,
};

export interface Team {
  name: string;
  shortName: string;
  logoUrl: string;
  record?: string;
  primaryColor?: string;
}

export interface Odds {
  spread: string;
  moneyline: string;
  total?: string; // Over/Under total
}

export interface Trigger {
  title: string;
  explanation: string;
}

export interface SocialPost {
  id: string;
  source: 'X' | 'Reddit' | 'TV' | 'Other';
  authorName: string;
  text: string;
  url?: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  displayName: string;
  text: string;
  createdAt: number;
  upvotes: number;
  downvotes: number;
  replies?: Comment[];
  isLiked?: boolean;
}

export interface TrapHistoryEvent {
  label: TrapLabel;
  timestamp: string; // ISO string
}

export interface Game {
  id: string;
  league: League;
  startTime: string; // ISO string
  homeTeam: Team;
  awayTeam: Team;
  isHomeFavorite: boolean;
  odds: Odds;
  publicMoneyPercent: number;
  publicBetsPercent: number;
  trapLabel: TrapLabel;
  trapMarket?: 'Moneyline' | 'Spread' | 'Total'; // Which market triggered the trap
  severityScore: number; // 0-100
  trapTriggers: Trigger[];
  whatPeopleAreSaying: SocialPost[];
  trapHistory?: TrapHistoryEvent[];
  finalOutcome?: 'TRAP' | 'NOT_TRAP'; // For historical scoring
}

export interface UserPreferences {
  favoriteLeagues: League[];
  favoriteTeams: string[]; // Team IDs (e.g., 'NFL-KC')
  notifications: {
    myTeams: {
      email: boolean;
      sms: boolean;
    };
    anyTrap: {
      email: boolean;
      sms: boolean;
    };
    contactEmail?: string;
    contactPhone?: string;
  };
}

export interface Vote {
  id: string;
  gameId: string;
  selection: 'TRAP' | 'NOT_TRAP';
  timestamp: number;
  isLocked: boolean; // If vote was placed before game start
  isCorrect?: boolean; // If game is over
  counted?: boolean; // For daily cap
}

export interface UserState {
  isAuthenticated: boolean;
  user?: {
    uid: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  votes: Record<string, Vote>;
  following: string[]; // User UIDs
  preferences?: UserPreferences;
}

export interface FilterState {
  league: League | 'ALL';
  search: string;
  label: TrapLabel | 'ALL';
}

export interface LeaderboardEntry {
  uid: string;
  username: string;
  avatarUrl?: string;
  accuracy: number;
  correctVotes: number;
  totalCountedVotes: number;
  streak: number;
  isCurrentUser: boolean;
  rank: number;
}

// API Response Types
export interface ApiOddsSide {
  betsPct: number;
  flag: number;
  odds: number;
  handlePct: number;
  diff: number;
}

export interface ApiTotalOdds {
  Line: number;
  Over: ApiOddsSide;
  Under: ApiOddsSide;
  Status?: string; // 'TC' | 'TD' | 'TP' (optional, may not always be present)
  StatusFactors?: ApiStatusFactors;
}

export interface ApiStatusFactors {
  Diff?: string;
}

export interface ApiMoneylineOdds {
  Home: ApiOddsSide;
  Away: ApiOddsSide;
  Status: string; // 'TC' | 'TD' | 'TP'
  StatusFactors: ApiStatusFactors;
}

export interface ApiSpreadOdds {
  Line: number;
  Home: ApiOddsSide;
  Away: ApiOddsSide;
  Status: string; // 'TC' | 'TD' | 'TP'
  StatusFactors: ApiStatusFactors;
}

export interface ApiCurrentOdds {
  Moneyline: ApiMoneylineOdds;
  Spread: ApiSpreadOdds;
  Total?: ApiTotalOdds;
}

export interface ApiGame {
  status: string;
  id: string;
  awayTeam: string;
  homeTeam: string;
  league: string;
  gameTimeET: string;
  lastUpdatedAt: string;
  currentOdds: ApiCurrentOdds;
}

export interface ApiFeedResponse {
  generatedAt: string;
  dateET: string;
  traps: {
    TC: ApiGame[];
    TD: ApiGame[];
    TP: ApiGame[];
  };
  by_league: {
    [key: string]: ApiGame[];
  };
}
