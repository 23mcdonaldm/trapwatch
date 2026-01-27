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
    Diff?: (string | string);
    PublicMoney?: (string | string);
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
  
  export interface ApiTrapEntry {
    market: 'Moneyline' | 'Spread' | 'Total';
    side: 'Home' | 'Away' | 'Over' | 'Under';
    event: ApiGame;
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
  