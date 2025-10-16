import { Recipe, GroceryListItem } from '../types';

const API_BASE_URL = 'https://deafening-gaye-yanik-dfb7fb04.koyeb.app';

interface AppData {
  recipes: Recipe[];
  groceryList: GroceryListItem[];
  lastUpdated?: string;
  deletedRecipeIds?: string[];
  deletedGroceryIds?: string[];
}

export const apiSync = {
  async getData(): Promise<AppData> {
    try {
      const response = await fetch(`${API_BASE_URL}/data`, { cache: 'no-cache' });
      if (response.ok) return await response.json();
      throw new Error('Failed to fetch data');
    } catch (error) {
      console.error('❌ API Error fetching data:', error);
      throw error;
    }
  },

  async saveData(data: AppData): Promise<AppData | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        cache: 'no-cache',
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('❌ API Error saving data:', error);
      return null;
    }
  },

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, { cache: 'no-cache' });
      return response.ok;
    } catch {
      return false;
    }
  }
};
