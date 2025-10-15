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

  // Save all data to backend - FIXED VERSION
  async saveData(data: AppData): Promise<boolean> {
    try {
      console.log('📤 Saving data to backend:', data);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        // 🔥 CRITICAL FIX: Get the merged data from backend
        const backendData = await response.json();
        console.log('📥 Backend response after save:', backendData);
        
        // 🔥 CRITICAL FIX: Update localStorage with backend's authoritative data
        // This prevents your local changes from being overwritten on next sync
        localStorage.setItem('family_recipes', JSON.stringify(backendData.recipes || []));
        localStorage.setItem('family_grocery', JSON.stringify(backendData.groceryList || []));
        
        console.log('✅ Data saved and localStorage updated');
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