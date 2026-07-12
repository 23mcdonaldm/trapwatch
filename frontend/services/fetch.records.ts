import { auth } from '../firebase/firebase';
import {
  ApiUserRecordResponse,
  ApiUserPicksResponse,
  ApiSystemRecordsResponse,
  ApiLeaderboardResponse,
} from '@/types/records';

const API_BASE_URL = 'http://localhost:8000/api/v1';

/** Get the signed-in user's Firebase ID token, or null when signed out. */
const getIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

export const recordsApiService = {
  /**
   * The signed-in user's profile + win/loss/push record.
   */
  getMyRecord: async (): Promise<ApiUserRecordResponse> => {
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Sign in required');
      }

      const response = await fetch(`${API_BASE_URL}/users/me/record`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json() as ApiUserRecordResponse;
    } catch (error) {
      console.error('Error fetching my record:', error);
      throw error;
    }
  },

  /**
   * A page of the signed-in user's picks, newest first.
   * @param cursor - nextCursor from the previous page; omit for the first page.
   */
  getMyPicks: async (limit = 20, cursor?: string): Promise<ApiUserPicksResponse> => {
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Sign in required');
      }

      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);

      const response = await fetch(`${API_BASE_URL}/users/me/picks?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json() as ApiUserPicksResponse;
    } catch (error) {
      console.error('Error fetching my picks:', error);
      throw error;
    }
  },

  /**
   * The system's graded record per trap tier (TC, TD, TP, overall). Public.
   */
  getSystemRecords: async (): Promise<ApiSystemRecordsResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/records/system`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json() as ApiSystemRecordsResponse;
    } catch (error) {
      console.error('Error fetching system records:', error);
      throw error;
    }
  },

  /**
   * Top users by wins. Public.
   */
  getLeaderboard: async (limit = 100): Promise<ApiLeaderboardResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/leaderboard?limit=${limit}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json() as ApiLeaderboardResponse;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  },
};
