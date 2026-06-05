
import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAiClient() {
    if (!aiInstance) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            throw new Error("Missing API key (GEMINI_API_KEY or API_KEY)");
        }
        aiInstance = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
                headers: {
                    'User-Agent': 'aistudio-build',
                }
            }
        });
    }
    return aiInstance;
}

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

async function parseRecipeFromImageInternal(imagePart: { inlineData: { data: string; mimeType: string; } }, allCategories: string[]) {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: {
            parts: [
                imagePart,
                { text: `Extract recipe details from this image. Valid categories: ${allCategories.join(', ')}. Response in French (except imagePrompt).` }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: recipeSchema,
        },
    });
    return JSON.parse(response.text || "{}");
}

async function parseRecipeFromUrlInternal(url: string, allCategories: string[]) {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: `Extract recipe from ${url}. Categories: ${allCategories.join(', ')}. Response in French (except imagePrompt).`,
        config: {
            responseMimeType: "application/json",
            responseSchema: recipeSchema,
        },
    });
    return JSON.parse(response.text || "{}");
}

async function generateImageFromPromptInternal(prompt: string) {
    const ai = getAiClient();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
    });
    if (response.generatedImages?.[0]) return response.generatedImages[0].image.imageBytes;
    throw new Error("Generation failed");
}

export default async function handler(req: any, res: any) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing API key" });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { action, payload } = req.body;
    try {
        switch (action) {
            case 'parseFromImage': return res.status(200).json(await parseRecipeFromImageInternal(payload.imagePart, payload.allCategories));
            case 'parseFromUrl': return res.status(200).json(await parseRecipeFromUrlInternal(payload.url, payload.allCategories));
            case 'generateImage': return res.status(200).json({ imageBase64: await generateImageFromPromptInternal(payload.prompt) });
            default: return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error: any) {
        console.error("Recipe API error:", error);
        return res.status(500).json({ error: error.message || "Service error" });
    }
}

