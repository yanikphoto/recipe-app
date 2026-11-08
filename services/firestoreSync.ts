import { 
    collection, 
    doc, 
    setDoc, 
    deleteDoc, 
    onSnapshot, 
    getDoc,
    query
} from "firebase/firestore";
import { db } from "./firebase";
import { Recipe, GroceryListItem } from "../types";
import { imageStore } from "./imageStore";

const MAX_CHUNK_SIZE = 500000; // 500 KB chunks, well below Firestore's 1 MB limit

export const firestoreSync = {
  // Subscribe to recipes collection in real time
  subscribeRecipes(onUpdate: (recipes: Recipe[]) => void, onError?: (err: any) => void) {
    const q = query(collection(db, "recipes"));
    return onSnapshot(q, (snapshot) => {
      const recipes: Recipe[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Recipe;
        recipes.push({
          ...data,
          id: docSnap.id
        });
      });
      // Sort recipes by updatedAt descending
      recipes.sort((a, b) => {
        const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return db - da;
      });
      onUpdate(recipes);
    }, (error) => {
      console.error("Firestore recipes listener error:", error);
      if (onError) onError(error);
    });
  },

  // Subscribe to grocery list in real time
  subscribeGrocery(onUpdate: (items: GroceryListItem[]) => void, onError?: (err: any) => void) {
    const q = query(collection(db, "grocery"));
    return onSnapshot(q, (snapshot) => {
      const items: GroceryListItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as GroceryListItem;
        items.push({
          ...data,
          id: docSnap.id
        });
      });
      items.sort((a, b) => (a.position || 0) - (b.position || 0));
      onUpdate(items);
    }, (error) => {
      console.error("Firestore grocery listener error:", error);
      if (onError) onError(error);
    });
  },

  // Save or update a recipe
  async saveRecipe(recipe: Recipe): Promise<void> {
    const { imageBase64, ...recipeToSave } = recipe;

    // Check if we have an image to save (either passed in recipe or cached locally in imageStore)
    let imageToUpload = imageBase64;
    if (!imageToUpload && recipe.imageUrl) {
      try {
        const localBlob = await imageStore.getImage(recipe.imageUrl);
        if (localBlob) {
          imageToUpload = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(localBlob);
          });
        }
      } catch (err) {
        console.warn("Could not retrieve local image from imageStore:", err);
      }
    }

    // If an image is provided or found, store it in recipe_images and local imageStore
    if (imageToUpload && recipe.imageUrl) {
      try {
        await this.saveImage(recipe.imageUrl, imageToUpload);
      } catch (imgErr) {
        console.warn("Failed saving image to Firestore (will still save recipe):", imgErr);
      }
    }

    // Clean and sanitize recipeToSave to remove any undefined properties
    const sanitizedRecipe = JSON.parse(JSON.stringify({
      ...recipeToSave,
      imageUrl: recipeToSave.imageUrl || '',
      servings: typeof recipeToSave.servings === 'number' ? recipeToSave.servings : 0,
      servingsUnit: recipeToSave.servingsUnit || '',
      categories: recipeToSave.categories || [],
      instructions: recipeToSave.instructions || [],
      ingredients: (recipeToSave.ingredients || []).map(ing => ({
        id: ing.id || '',
        name: ing.name || '',
        quantity: typeof ing.quantity === 'number' ? ing.quantity : 0,
        unit: ing.unit || '',
        isSectionHeader: Boolean(ing.isSectionHeader),
      })),
      updatedAt: recipe.updatedAt || new Date().toISOString()
    }));

    const docRef = doc(db, "recipes", recipe.id);
    await setDoc(docRef, sanitizedRecipe, { merge: true });
  },

  // Delete a recipe and its image
  async deleteRecipe(id: string, imageUrl?: string): Promise<void> {
    await deleteDoc(doc(db, "recipes", id));
    if (imageUrl) {
      try {
        const imageDocRef = doc(db, "recipe_images", imageUrl);
        const snap = await getDoc(imageDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.isChunked && data.chunkCount) {
            for (let i = 0; i < data.chunkCount; i++) {
              await deleteDoc(doc(db, "recipe_images", `${imageUrl}_part_${i}`));
            }
          }
          await deleteDoc(imageDocRef);
        }
        await imageStore.deleteImage(imageUrl);
      } catch (e) {
        console.warn("Could not delete image:", e);
      }
    }
  },

  // Grocery item actions
  async saveGroceryItem(item: GroceryListItem): Promise<void> {
    const docRef = doc(db, "grocery", item.id);
    await setDoc(docRef, {
      ...item,
      updatedAt: item.updatedAt || new Date().toISOString()
    }, { merge: true });
  },

  async deleteGroceryItem(id: string): Promise<void> {
    await deleteDoc(doc(db, "grocery", id));
  },

  // Save an image to Firestore (chunked across docs if > 500KB) and to local indexedDB
  async saveImage(imageId: string, base64Data: string): Promise<void> {
    // 1. Save locally in indexedDB for immediate display
    try {
      await imageStore.saveImage(imageId, base64Data);
    } catch (e) {
      console.warn("Failed saving to local indexedDB:", e);
    }

    // Clean base64 string
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

    if (cleanBase64.length <= MAX_CHUNK_SIZE) {
      // Single doc is sufficient
      await setDoc(doc(db, "recipe_images", imageId), {
        imageId,
        isChunked: false,
        data: cleanBase64,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Split into multiple separate documents to never exceed 1MB
      const chunks: string[] = [];
      for (let i = 0; i < cleanBase64.length; i += MAX_CHUNK_SIZE) {
        chunks.push(cleanBase64.slice(i, i + MAX_CHUNK_SIZE));
      }

      for (let i = 0; i < chunks.length; i++) {
        await setDoc(doc(db, "recipe_images", `${imageId}_part_${i}`), {
          partIndex: i,
          data: chunks[i],
          updatedAt: new Date().toISOString()
        });
      }

      await setDoc(doc(db, "recipe_images", imageId), {
        imageId,
        isChunked: true,
        chunkCount: chunks.length,
        updatedAt: new Date().toISOString()
      });
    }
  },

  // Get image data: checks local cache first, then Firestore
  async getImage(imageId: string): Promise<Blob | null> {
    if (!imageId) return null;

    // 1. Try local cache
    try {
      const localBlob = await imageStore.getImage(imageId);
      if (localBlob) return localBlob;
    } catch (e) {}

    // 2. Try Firestore
    try {
      const imageDocRef = doc(db, "recipe_images", imageId);
      const snap = await getDoc(imageDocRef);
      if (snap.exists()) {
        const data = snap.data();
        let fullBase64 = '';

        if (data.isChunked && data.chunkCount) {
          const partPromises = [];
          for (let i = 0; i < data.chunkCount; i++) {
            partPromises.push(getDoc(doc(db, "recipe_images", `${imageId}_part_${i}`)));
          }
          const partSnaps = await Promise.all(partPromises);
          fullBase64 = partSnaps.map(p => p.data()?.data || '').join('');
        } else if (data.data) {
          fullBase64 = data.data;
        }

        if (fullBase64) {
          // Save locally for future instant loads
          await imageStore.saveImage(imageId, fullBase64);
          return await imageStore.getImage(imageId) || null;
        }
      }
    } catch (e) {
      console.error(`Error loading image ${imageId} from Firestore:`, e);
    }

    return null;
  },

  // Import complete JSON backup into Firestore
  async importBackup(
    backup: { recipes: Recipe[]; groceryList?: GroceryListItem[] },
    onProgress?: (current: number, total: number, status: string) => void
  ): Promise<{ recipesImported: number; imagesImported: number }> {
    const recipes = backup.recipes || [];
    const grocery = backup.groceryList || [];
    const total = recipes.length + grocery.length;
    let current = 0;
    let imagesImported = 0;

    // Upload grocery items first
    for (const item of grocery) {
      current++;
      if (onProgress) onProgress(current, total, `Importation des éléments d'épicerie (${current}/${total})...`);
      await this.saveGroceryItem(item);
    }

    // Upload recipes
    for (const recipe of recipes) {
      current++;
      if (onProgress) onProgress(current, total, `Importation de "${recipe.title}" (${current}/${total})...`);
      
      const { imageBase64, ...recipeData } = recipe;
      
      // Save image if present
      if (imageBase64 && recipe.imageUrl) {
        try {
          await this.saveImage(recipe.imageUrl, imageBase64);
          imagesImported++;
        } catch (imgErr) {
          console.warn(`Could not save image for ${recipe.title}:`, imgErr);
        }
      }

      await setDoc(doc(db, "recipes", recipe.id), {
        ...recipeData,
        updatedAt: recipe.updatedAt || new Date().toISOString()
      }, { merge: true });
    }

    return { recipesImported: recipes.length, imagesImported };
  }
};
