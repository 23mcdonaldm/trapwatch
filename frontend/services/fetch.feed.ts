import { ApiFeedResponse } from '@/types/odds';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const apiService = {
  /**
   * Fetch games from the feed endpoint for a specific date
   * @param dateET - ISO date string (defaults to today if not provided)
   */
  getFeed: async (dateET?: string): Promise<ApiFeedResponse> => {
    try {
      const url = dateET 
        ? `${API_BASE_URL}/feed?dateET=${encodeURIComponent(dateET)}`
        : `${API_BASE_URL}/feed`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data as ApiFeedResponse;
    } catch (error) {
      console.error('Error fetching feed:', error);
      throw error;
    }
  },
};
