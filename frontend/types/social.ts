// Social (votes/comments) API types

export type ApiMarket = 'Moneyline' | 'Spread' | 'Total';
export type ApiVoteSide = 'Home' | 'Away' | 'Over' | 'Under';

export interface ApiVoteResponse {
  generatedAt: string;
  vote: boolean; // true = recorded, false = user already voted
}

export interface ApiCommentResponse {
  generatedAt: string;
  comment: boolean;
}

export interface ApiComment {
  id: string;
  userId: string;
  displayName: string;
  comment: string;
  generatedAt: string; // ISO string
}

export interface ApiCommentsListResponse {
  generatedAt: string;
  comments: ApiComment[];
  nextCursor: string | null;
}

/** Vote tallies on a social aggregate / derived client-side from vote docs. */
export interface VoteCounts {
  home: number;
  away: number;
  over: number;
  under: number;
}

/** The Firestore doc id for a game+market social bucket ("opportunity"). */
export const opportunityId = (gameId: string, market: ApiMarket): string =>
  `${gameId}_${market.toLowerCase()}`;
