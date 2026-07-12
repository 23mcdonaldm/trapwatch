import { ApiGamesResponse, ApiUpcomingGamesResponse, ApiGameResponse } from '@/types/odds';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const gamesApiService = {
  /**
   * Fetch ALL games (not just traps) grouped by league for a specific date
   * @param dateET - ET date string (YYYY-MM-DD). If omitted, backend defaults to "today".
   */
  getGames: async (dateET?: string): Promise<ApiGamesResponse> => {
    try {
      const url = dateET
        ? `${API_BASE_URL}/games?dateET=${encodeURIComponent(dateET)}`
        : `${API_BASE_URL}/games`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ApiGamesResponse;
    } catch (error) {
      console.error('Error fetching games:', error);
      throw error;
    }
  },

  /**
   * Fetch every upcoming game (today ET forward, DK's ~30-day horizon),
   * grouped day-first then league. Powers the All Games "Upcoming" view.
   */
  getUpcomingGames: async (): Promise<ApiUpcomingGamesResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/games/upcoming`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ApiUpcomingGamesResponse;
    } catch (error) {
      console.error('Error fetching upcoming games:', error);
      throw error;
    }
  },

  /**
   * Fetch a single game by id along with its social aggregates.
   */
  getGame: async (gameId: string): Promise<ApiGameResponse> => {
    try {
      const url = `${API_BASE_URL}/games/${encodeURIComponent(gameId)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ApiGameResponse;
    } catch (error) {
      console.error('Error fetching game:', error);
      throw error;
    }
  },
};
