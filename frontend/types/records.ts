// Types for the records/picks/leaderboard endpoints
// (GET /users/me/record, /users/me/picks, /records/system, /leaderboard)

export type PickResult = 'pending' | 'win' | 'loss' | 'push';

export interface ApiRecord {
  wins: number;
  losses: number;
  pushes: number;
}

export interface ApiUserRecordResponse {
  generatedAt: string;
  userId: string;
  displayName: string;
  record: ApiRecord;
}

export interface ApiPick {
  userId: string;
  gameId: string;
  opportunityId: string;
  league: string;
  market: string; // lowercase: moneyline | spread | total
  side: 'home' | 'away' | 'over' | 'under';
  gameTimeET: string;
  result: PickResult;
  generatedAt: string;
  evaluatedAt: string | null;
}

export interface ApiUserPicksResponse {
  generatedAt: string;
  picks: ApiPick[];
  nextCursor: string | null;
}

export interface ApiSystemRecordsResponse {
  generatedAt: string;
  // Keyed by tier: TC | TD | TP | overall
  records: { [tier: string]: ApiRecord & { updatedAt?: string } };
}

export interface ApiLeaderboardEntry {
  userId: string;
  displayName: string;
  record: ApiRecord;
}

export interface ApiLeaderboardResponse {
  generatedAt: string;
  leaderboard: ApiLeaderboardEntry[];
}

/** Win percentage over decided picks (pushes excluded); null when nothing decided. */
export const winPct = (record: ApiRecord): number | null => {
  const decided = record.wins + record.losses;
  return decided === 0 ? null : (record.wins / decided) * 100;
};
