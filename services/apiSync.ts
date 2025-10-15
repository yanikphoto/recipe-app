import { Recipe, GroceryListItem } from '../types';

// 🔥 FIX: Use the correct endpoint
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
      const response = await fetch(API_URL);
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

  // Save all data to backend - NOW WORKS WITH BACKEND MERGING
  async saveData(data: AppData): Promise<boolean> {
    try {
      console.log('📤 Saving data to backend:', data);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        // Backend now returns merged data
        const mergedData = await response.json();
        console.log('📥 Backend merged data:', mergedData);
        
        // Update localStorage with merged data
        localStorage.setItem('family_recipes', JSON.stringify(mergedData.recipes || []));
        localStorage.setItem('family_grocery', JSON.stringify(mergedData.groceryList || []));
        
        return true;
      } else {
        console.error('❌ Backend returned error:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ API Error during save:', error);
      return false;
    }
  },

  // 🔥 NEW: Add single recipe (more reliable)
  async addRecipeOnly(newRecipe: Recipe): Promise<boolean> {
    try {
      console.log('📤 Adding single recipe:', newRecipe);
      
      const response = await fetch('https://recipe-app-backend-pt4u.onrender.com/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecipe)
      });
      
      if (response.ok) {
        const savedRecipe = await response.json();
        console.log('✅ Recipe saved:', savedRecipe);
        
        // Update localStorage
        const currentRecipes = JSON.parse(localStorage.getItem('family_recipes') || '[]');
        const updatedRecipes = [savedRecipe, ...currentRecipes.filter(r => r.id !== savedRecipe.id)];
        localStorage.setItem('family_recipes', JSON.stringify(updatedRecipes));
        
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
      const response = await fetch('https://recipe-app-backend-pt4u.onrender.com/api/health');
      return response.ok;
    } catch {
      return false;
    }
  }
};