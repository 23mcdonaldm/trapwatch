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
  espnId?: number;
  aliases?: string[];
}

export interface Odds {
  spread: string;
  moneyline: string;
  total?: string; // Over/Under total line
  totalOver?: string; // Over odds (e.g., "-110")
  totalUnder?: string; // Under odds (e.g., "-110")
}

export interface Trigger {
  title: string;
  explanation: string;
  trendArrow?: {
    direction: 'up' | 'down';
    color: 'green' | 'orange' | 'yellow' | 'red';
  };
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
  trapLabel?: TrapLabel; // undefined = game not currently flagged as a trap
  trapMarket?: 'Moneyline' | 'Spread' | 'Total'; // Which market triggered the trap
  trapSide?: 'Home' | 'Away' | 'Over' | 'Under'; // Which side the trap is on
  severityScore: number; // 0-100
  trapTriggers: Trigger[];
  whatPeopleAreSaying: SocialPost[];
  trapHistory?: TrapHistoryEvent[];
  finalOutcome?: 'TRAP' | 'NOT_TRAP'; // For historical scoring
  // Score state from the scores poller (freshness = poll cadence, not real-time)
  status?: 'unstarted' | 'live' | 'completed';
  liveScore?: { home: number; away: number };
  finalScore?: { home: number; away: number };
  scoresUpdatedAt?: string;
  // Line of the flagged market — needed to grade the trap client-side (W/L/P chip)
  trapLine?: number;
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
  date: string | 'upcoming'; // ISO date string or 'upcoming' for today/future
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