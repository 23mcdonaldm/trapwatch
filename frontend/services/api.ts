import { ApiFeedResponse } from '../types';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const apiService = {
  /**
   * Fetch today's games from the feed endpoint
   */
  getFeed: async (): Promise<ApiFeedResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/feed`);
      
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
