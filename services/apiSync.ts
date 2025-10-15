import { Recipe, GroceryListItem } from '../types';

// Replace with your actual Render URL
const API_URL = 'https://recipe-app-backend-pt4u.onrender.com';

interface AppData {
  recipes: Recipe[];
  groceryList: GroceryListItem[];
}

export const apiSync = {
  // Get all data from backend
  async getData(): Promise<AppData> {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch data');
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Save all data to backend
  async saveData(data: AppData): Promise<boolean> {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.ok;
    } catch (error) {
      console.error('API Error:', error);
      return false;
    }
  },

  // Check if backend is available
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL.replace('/data', '/health')}`);
      return response.ok;
    } catch {
      return false;
    }
  }
};