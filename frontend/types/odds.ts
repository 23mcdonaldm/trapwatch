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
    // Future
    // Diff?: (string | string);
    // Current
    // Diff?: {string: string};
    PublicMoney?: string;
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
  