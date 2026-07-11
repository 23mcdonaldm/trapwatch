import { auth } from '../firebase/firebase';
import { ApiVoteResponse, ApiCommentResponse, ApiCommentsListResponse, ApiMarket, ApiVoteSide } from '@/types/social';

const API_BASE_URL = 'http://localhost:8000/api/v1';

/** Get the signed-in user's Firebase ID token, or null when signed out. */
const getIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

export const socialApiService = {
  /**
   * Vote on a game's market. Requires a signed-in user.
   * Resolves vote=true when the vote was recorded, vote=false when this user already voted.
   */
  postVote: async (gameId: string, market: ApiMarket, side: ApiVoteSide): Promise<ApiVoteResponse> => {
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Sign in required to vote');
      }

      const response = await fetch(`${API_BASE_URL}/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ game_id: gameId, market, side }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ApiVoteResponse;
    } catch (error) {
      console.error('Error posting vote:', error);
      throw error;
    }
  },

  /**
   * Post a comment on a game's market. Requires a signed-in user.
   */
  postComment: async (gameId: string, market: ApiMarket, displayName: string, comment: string): Promise<ApiCommentResponse> => {
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Sign in required to comment');
      }

      const response = await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ game_id: gameId, market, display_name: displayName, comment }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ApiCommentResponse;
    } catch (error) {
      console.error('Error posting comment:', error);
      throw error;
    }
  },

  /**
   * Fetch a page of comments for a game's market, newest first.
   * @param cursor - nextCursor from the previous page; omit for the first page.
   */
  getComments: async (gameId: string, market: ApiMarket, limit = 20, cursor?: string): Promise<ApiCommentsListResponse> => {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);

      const url = `${API_BASE_URL}/comments/${encodeURIComponent(gameId)}/${market}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ApiCommentsListResponse;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  },
};
