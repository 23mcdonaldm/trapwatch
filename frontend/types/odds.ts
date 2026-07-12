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
    StatusSide?: string; // 'Over' | 'Under'
    StatusFactors?: ApiStatusFactors;
  }
  
  export interface ApiStatusFactors {
    Diff?: [string, string]; // [status, side] e.g., ["TC", "Home"]
    PublicMoney?: [string, string]; // [status, side] e.g., ["TD", "Away"]
  }
  
  export interface ApiMoneylineOdds {
    Home: ApiOddsSide;
    Away: ApiOddsSide;
    Status: string; // 'TC' | 'TD' | 'TP'
    StatusSide?: string; // 'Home' | 'Away'
    StatusFactors?: ApiStatusFactors;
  }
  
  export interface ApiSpreadOdds {
    Line: number;
    Home: ApiOddsSide;
    Away: ApiOddsSide;
    Status: string; // 'TC' | 'TD' | 'TP'
    StatusSide?: string; // 'Home' | 'Away'
    StatusFactors?: ApiStatusFactors;
  }
  
  export interface ApiCurrentOdds {
    Moneyline: ApiMoneylineOdds;
    Spread: ApiSpreadOdds;
    Total?: ApiTotalOdds;
  }
  
  export interface ApiScore {
    home: number;
    away: number;
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
    liveScore?: ApiScore | null;
    finalScore?: ApiScore | null;
    scoresUpdatedAt?: string | null;
  }
  
  export interface ApiSocialAggregate {
    counts?: { home?: number; away?: number; over?: number; under?: number };
    commentCount?: number;
    latestComment?: {
      commentId: string;
      userId: string;
      comment: string;
      generatedAt: string;
    } | null;
  }

  export interface ApiTrapEntry {
    market: 'Moneyline' | 'Spread' | 'Total';
    side: 'Home' | 'Away' | 'Over' | 'Under';
    event: ApiGame;
    social?: ApiSocialAggregate;
  }

  export interface ApiFeedResponse {
    generatedAt: string;
    dateET: string;
    traps: {
      TC: ApiTrapEntry[];
      TD: ApiTrapEntry[];
      TP: ApiTrapEntry[];
    };
    by_league: {
      [key: string]: ApiGame[];
    };
  }

  /** Slim game summary returned by GET /games — just enough to render a clickable row. */
  export interface ApiGameSummary {
    id: string;
    league: string;
    awayTeam: string;
    homeTeam: string;
    gameTimeET: string;
    status: string;
    liveScore?: ApiScore | null;
    finalScore?: ApiScore | null;
    scoresUpdatedAt?: string | null;
  }

  export interface ApiGamesResponse {
    generatedAt: string;
    dateET: string;
    by_league: {
      [key: string]: ApiGameSummary[];
    };
    total: number;
  }

  export interface ApiUpcomingDay {
    dateET: string;
    by_league: {
      [key: string]: ApiGameSummary[];
    };
    total: number;
  }

  export interface ApiUpcomingGamesResponse {
    generatedAt: string;
    todayET: string;
    days: ApiUpcomingDay[];
    total: number;
  }

  export interface ApiGameResponse {
    generatedAt: string;
    event: ApiGame;
    social: {
      [market: string]: ApiSocialAggregate; // market keys are lowercase
    };
  }

  /** One side's numbers at one snapshot in a movement-history series. */
  export interface ApiHistorySide {
    odds: number | null;
    betsPct: number | null;
    handlePct: number | null;
  }

  /** One snapshot: `line` present for spread/total; sides keyed home/away or over/under. */
  export interface ApiHistoryPoint {
    t: string;
    line?: number | null;
    home?: ApiHistorySide;
    away?: ApiHistorySide;
    over?: ApiHistorySide;
    under?: ApiHistorySide;
  }

  export interface ApiGameHistoryResponse {
    generatedAt: string;
    gameId: string;
    moneyline: ApiHistoryPoint[];
    spread: ApiHistoryPoint[];
    total: ApiHistoryPoint[];
  }
  