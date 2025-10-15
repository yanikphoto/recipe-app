import { Recipe, GroceryListItem } from '../types';

// Use the correct endpoint for the Render.com backend
const API_URL = 'https://recipe-app-backend-pt4u.onrender.com/api/data';

interface AppData {
  recipes: Recipe[];
  groceryList: GroceryListItem[];
  lastUpdated?: string;
}

export const apiSync = {
  // Get all data from backend
  async getData(): Promise<AppData> {
    try {
      const response = await fetch(API_URL, { cache: 'no-cache' });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Data fetched from backend:', data);
        return data;
      }
      throw new Error('Failed to fetch data');
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  },

  // Save all data to backend and return the merged data
  async saveData(data: AppData): Promise<AppData | null> {
    try {
      console.log('📤 Saving data to backend:', data);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        cache: 'no-cache',
      });
      
      if (response.ok) {
        // Backend returns the fully merged data
        const mergedData = await response.json();
        console.log('📥 Backend merged data:', mergedData);
        return mergedData;
      } else {
        console.error('❌ Backend returned error:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('❌ API Error during save:', error);
      return null;
    }
  },

  // Add a single recipe to the backend
  async addRecipeOnly(newRecipe: Recipe): Promise<boolean> {
    try {
      console.log('📤 Adding single recipe:', newRecipe);
      
      const response = await fetch('https://recipe-app-backend-pt4u.onrender.com/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecipe),
        cache: 'no-cache',
      });
      
      if (response.ok) {
        const savedRecipe = await response.json();
        console.log('✅ Recipe saved:', savedRecipe.title);
        return true;
      } else {
        console.error('❌ Failed to save recipe:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error adding recipe:', error);
      return false;
    }
  },

  // Check if backend is available
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('https://recipe-app-backend-pt4u.onrender.com/api/health', { cache: 'no-cache' });
      return response.ok;
    } catch {
      return false;
    }
  }
};