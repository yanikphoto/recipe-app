const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists on startup
if (!fsSync.existsSync(UPLOADS_DIR)) {
    fsSync.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve image files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper to safely load data
async function loadData() {
    try {
        if (!fsSync.existsSync(DATA_FILE)) {
            const initialData = { recipes: [], groceryList: [], deletedRecipeIds: [], deletedGroceryIds: [] };
            await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
            return initialData;
        }
        const content = await fs.readFile(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(content || '{}');
        return {
            recipes: parsed.recipes || [],
            groceryList: parsed.groceryList || [],
            deletedRecipeIds: parsed.deletedRecipeIds || [],
            deletedGroceryIds: parsed.deletedGroceryIds || []
        };
    } catch (error) {
        console.error("Error reading data file:", error);
        return { recipes: [], groceryList: [], deletedRecipeIds: [], deletedGroceryIds: [] };
    }
}

// Helper to safely save data
async function saveData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error writing data file:", error);
    }
}

// --- Simple Async Lock to prevent race conditions ---
let isLocked = false;
const withLock = async (fn) => {
    while (isLocked) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    isLocked = true;
    try {
        return await fn();
    } finally {
        isLocked = false;
    }
};

// --- API Endpoints ---

// Check database connection and health
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// GET /data - returns the current storage state
app.get('/data', async (req, res) => {
    const data = await withLock(async () => {
        return await loadData();
    });
    res.status(200).json(data);
});

// POST /data - merges and synchronizes full data state
app.post('/data', async (req, res) => {
    const clientData = req.body || {};
    
    const mergedResult = await withLock(async () => {
        const storedData = await loadData();
        
        // 1. Merge deleted item lists
        const clientDelRecipes = clientData.deletedRecipeIds || [];
        const clientDelGrocery = clientData.deletedGroceryIds || [];
        
        const mergedDelRecipes = Array.from(new Set([...(storedData.deletedRecipeIds || []), ...clientDelRecipes]));
        const mergedDelGrocery = Array.from(new Set([...(storedData.deletedGroceryIds || []), ...clientDelGrocery]));
        
        // 2. Merge Grocery list
        const clientGrocery = clientData.groceryList || [];
        const storedGroceryMap = new Map((storedData.groceryList || []).map(g => [g.id, g]));
        
        for (const item of clientGrocery) {
            if (mergedDelGrocery.includes(item.id)) {
                storedGroceryMap.delete(item.id);
                continue;
            }
            
            const existing = storedGroceryMap.get(item.id);
            if (!existing) {
                storedGroceryMap.set(item.id, item);
            } else {
                const dateExisting = new Date(existing.updatedAt || 0).getTime();
                const dateItem = new Date(item.updatedAt || 0).getTime();
                if (dateItem > dateExisting) {
                    storedGroceryMap.set(item.id, item);
                }
            }
        }
        
        // Filter out any stored item that was deleted
        const finalGrocery = Array.from(storedGroceryMap.values()).filter(g => !mergedDelGrocery.includes(g.id));
        
        // 3. Merge Recipes
        const clientRecipes = clientData.recipes || [];
        const storedRecipesMap = new Map((storedData.recipes || []).map(r => [r.id, r]));
        
        for (const recipe of clientRecipes) {
            if (mergedDelRecipes.includes(recipe.id)) {
                storedRecipesMap.delete(recipe.id);
                continue;
            }
            
            // Handle saving image base64 if provided
            if (recipe.imageBase64 && recipe.imageUrl) {
                try {
                    const buffer = Buffer.from(recipe.imageBase64, 'base64');
                    const filename = `${recipe.imageUrl}.jpg`;
                    const filepath = path.join(UPLOADS_DIR, filename);
                    await fs.writeFile(filepath, buffer);
                } catch (imgError) {
                    console.error(`Error saving image for recipe ${recipe.id}:`, imgError);
                }
            }
            
            // Clean up imageBase64 before saving to disk
            const { imageBase64, ...recipeToSave } = recipe;
            
            const existing = storedRecipesMap.get(recipe.id);
            if (!existing) {
                storedRecipesMap.set(recipe.id, recipeToSave);
            } else {
                const dateExisting = new Date(existing.updatedAt || 0).getTime();
                const dateRecipe = new Date(recipe.updatedAt || 0).getTime();
                if (dateRecipe > dateExisting) {
                    storedRecipesMap.set(recipe.id, recipeToSave);
                }
            }
        }
        
        // Filter out any stored recipe that was deleted
        const finalRecipes = Array.from(storedRecipesMap.values()).filter(r => !mergedDelRecipes.includes(r.id));
        
        const finalData = {
            recipes: finalRecipes,
            groceryList: finalGrocery,
            deletedRecipeIds: mergedDelRecipes,
            deletedGroceryIds: mergedDelGrocery
        };
        
        await saveData(finalData);
        return finalData;
    });
    
    res.status(200).json(mergedResult);
});

// POST /api/recipe - handles recipe parsing using Gemini (placed directly on backend)
app.post('/api/recipe', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "Missing API key on server" });
    }
    const { action, payload } = req.body;
    try {
        const { GoogleGenAI, Type } = require('@google/genai');
        const ai = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
                headers: {
                    'User-Agent': 'aistudio-build',
                }
            }
        });
        
        const recipeSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "The title of the recipe." },
                categories: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "A list of categories for the recipe."
                },
                servings: { type: Type.NUMBER, description: "Number of servings." },
                servingsUnit: { type: Type.STRING, description: "Unit (e.g., persons)." },
                ingredients: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            quantity: { type: Type.NUMBER },
                            unit: { type: Type.STRING },
                            isSectionHeader: { type: Type.BOOLEAN },
                        },
                        required: ['name'],
                    }
                },
                instructions: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING }
                },
                imagePrompt: { type: Type.STRING, description: "English prompt for image generation." }
            },
            required: ['title', 'categories', 'ingredients', 'instructions', 'imagePrompt'],
        };

        const generateWithFallback = async (contents, schema) => {
            const candidateModels = ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
            let lastError = null;
            for (const model of candidateModels) {
                try {
                    const response = await ai.models.generateContent({
                        model,
                        contents,
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: schema,
                        },
                    });
                    if (response.text) {
                        return JSON.parse(response.text);
                    }
                } catch (err) {
                    console.warn(`Model ${model} failed in server.js, trying fallback:`, err?.message || err);
                    lastError = err;
                }
            }
            throw lastError || new Error("Extraction failed on all available models");
        };

        if (action === 'parseFromImage') {
            const contents = {
                parts: [
                    payload.imagePart,
                    { text: `Extract recipe details from this image. Valid categories: ${payload.allCategories.join(', ')}. Response in French (except imagePrompt).` }
                ]
            };
            const result = await generateWithFallback(contents, recipeSchema);
            return res.status(200).json(result);
        } else if (action === 'parseFromUrl') {
            const contents = `Extract recipe from ${payload.url}. Categories: ${payload.allCategories.join(', ')}. Response in French (except imagePrompt).`;
            const result = await generateWithFallback(contents, recipeSchema);
            return res.status(200).json(result);
        } else if (action === 'generateImage') {
            const imageModels = ['imagen-4.0-generate-001', 'imagen-3.0-generate-002'];
            for (const model of imageModels) {
                try {
                    const response = await ai.models.generateImages({
                        model,
                        prompt: payload.prompt,
                        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
                    });
                    if (response.generatedImages?.[0]?.image?.imageBytes) {
                        return res.status(200).json({ imageBase64: response.generatedImages[0].image.imageBytes });
                    }
                } catch (err) {
                    console.warn(`Image model ${model} failed in server.js, trying fallback:`, err?.message || err);
                }
            }
            throw new Error("Generation failed");
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error("Gemini server-side API error in server.js:", error);
        return res.status(500).json({ error: error.message || "Service error" });
    }
});

// Start listening
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
