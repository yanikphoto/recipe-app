import { Recipe, GroceryListItem, AppData } from '../types';
import { imageStore } from './imageStore';

const API_BASE_URL = 'https://deafening-gaye-yanik-dfb7fb04.koyeb.app';

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

  async saveData(data: AppData, lastSyncTime: Date | null): Promise<AppData | null> {
    try {
        const payload: AppData = JSON.parse(JSON.stringify(data));
        const lastSyncTimestamp = lastSyncTime ? lastSyncTime.getTime() : 0;

        for (const recipe of payload.recipes) {
            const isLocalImage = recipe.imageUrl && !recipe.imageUrl.startsWith('data:') && !recipe.imageUrl.startsWith('http');
            
            // Determine if the recipe is new or has been updated since the last sync.
            const recipeLastUpdated = recipe.updatedAt ? new Date(recipe.updatedAt).getTime() : 0;
            const needsImageUpload = recipeLastUpdated > lastSyncTimestamp;

            if (isLocalImage && needsImageUpload) {
                try {
                    const blob = await imageStore.getImage(recipe.imageUrl);
                    if (blob) {
                        const base64 = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const result = reader.result as string;
                                if (result) {
                                  resolve(result.split(',')[1]);
                                } else {
                                  reject(new Error("FileReader did not return a result."))
                                }
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                        recipe.imageBase64 = base64;
                    }
                } catch (e) {
                    console.error(`Could not load image ${recipe.imageUrl} from local store for sync.`, e);
                }
            }
        }

      const response = await fetch(`${API_BASE_URL}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      const url = `${API_BASE_URL}/health?t=${new Date().getTime()}`;
      const response = await fetch(url, { cache: 'no-cache' });
      return response.ok;
    } catch {
      return false;
    }
  }
};