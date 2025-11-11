import { AppData } from '../types';
import { imageStore } from './imageStore';

const API_BASE_URL = 'https://deafening-gaye-yanik-dfb7fb04.koyeb.app';

// Helper to post data and handle errors, to avoid repetition.
async function postData(payload: AppData): Promise<AppData | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            cache: 'no-cache',
        });
        if (response.ok) {
            return await response.json();
        }
        if (response.status === 413) {
             console.error('❌ API Error: Payload too large. The request body is too big for the server to handle.');
        }
        return null;
    } catch (error) {
        console.error('❌ API Error posting data:', error);
        return null;
    }
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

  async saveData(data: AppData, lastSyncTime: Date | null): Promise<AppData | null> {
    const lastSyncTimestamp = lastSyncTime ? lastSyncTime.getTime() : 0;

    // 1. Identify recipes that need their image uploaded. These are new/updated recipes with local images.
    const recipesWithImagesToUpload = data.recipes.filter(recipe => {
        const isLocalImage = recipe.imageUrl && !recipe.imageUrl.startsWith('data:') && !recipe.imageUrl.startsWith('http');
        const recipeLastUpdated = recipe.updatedAt ? new Date(recipe.updatedAt).getTime() : 0;
        return isLocalImage && (recipeLastUpdated > lastSyncTimestamp);
    });

    // 2. Create and send the main payload without any images.
    // This syncs all text data, grocery lists, and deletions immediately and should be small.
    const mainPayload: AppData = {
        ...data,
        recipes: data.recipes.map(r => {
            const { imageBase64, ...recipeWithoutImage } = r;
            return recipeWithoutImage;
        }),
    };

    const mainSyncResponse = await postData(mainPayload);

    // 3. After the main sync, upload images in the background in small batches.
    // This runs as a fire-and-forget process to not block the UI.
    if (recipesWithImagesToUpload.length > 0) {
        (async () => {
            const IMAGE_UPLOAD_BATCH_SIZE = 1; // Batch size of 1 is safest for free tier limits.

            for (let i = 0; i < recipesWithImagesToUpload.length; i += IMAGE_UPLOAD_BATCH_SIZE) {
                const batch = recipesWithImagesToUpload.slice(i, i + IMAGE_UPLOAD_BATCH_SIZE);
                
                const recipesWithImages = await Promise.all(batch.map(async (recipe) => {
                    let imageBase64: string | undefined = undefined;
                    try {
                        const blob = await imageStore.getImage(recipe.imageUrl);
                        if (blob) {
                            imageBase64 = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    const result = reader.result as string;
                                    resolve(result ? result.split(',')[1] : '');
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(blob);
                            });
                        }
                    } catch (e) {
                        console.error(`Could not load image ${recipe.imageUrl} for sync.`, e);
                    }
                    return { ...recipe, imageBase64 };
                }));

                const imagePayload: AppData = {
                    recipes: recipesWithImages,
                    groceryList: [],
                    deletedRecipeIds: [],
                    deletedGroceryIds: [],
                };
                
                // Post the batch. If it fails, it will be retried on a future app start/sync cycle.
                await postData(imagePayload);
            }
        })();
    }

    // 4. Return the result of the main text-only sync. `App.tsx` will use this to update state.
    return mainSyncResponse;
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