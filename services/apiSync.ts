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

  async saveData(data: AppData): Promise<AppData | null> {
    try {
        const payload: AppData = JSON.parse(JSON.stringify(data));

        for (const recipe of payload.recipes) {
            const isLocalImage = recipe.imageUrl && !recipe.imageUrl.startsWith('data:') && !recipe.imageUrl.startsWith('http');
            if (isLocalImage) {
                try {
                    const blob = await imageStore.getImage(recipe.imageUrl);
                    if (blob) {
                        const base64 = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const result = reader.result as string;
                                resolve(result.split(',')[1]);
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
      const response = await fetch(`${API_BASE_URL}/health`, { cache: 'no-cache' });
      return response.ok;
    } catch {
      return false;
    }
  }
};
