
import { Recipe, GroceryListItem } from '../types';

const API_BASE_URL = 'https://recipe-app-backend-pt4u.onrender.com/api';

interface AppData {
  recipes: Recipe[];
  groceryList: GroceryListItem[];
  lastUpdated?: string;
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

  async addRecipeOnly(newRecipe: Recipe): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecipe),
        cache: 'no-cache',
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Error adding recipe:', error);
      return false;
    }
  },

  async deleteRecipe(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/recipes/${id}`, {
        method: 'DELETE',
        cache: 'no-cache',
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Error deleting recipe:', error);
      return false;
    }
  },
  
  async addGroceryItem(newItem: GroceryListItem): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/grocery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
        cache: 'no-cache',
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Error adding grocery item:', error);
      return false;
    }
  },
  
  async deleteGroceryItem(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/grocery/${id}`, {
        method: 'DELETE',
        cache: 'no-cache',
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Error deleting grocery item:', error);
      return false;
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
