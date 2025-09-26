// FIX: Import necessary types and classes from @google/genai.
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe } from '../types';

// FIX: Initialize GoogleGenAI with API key from environment variables as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const recipeSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "The title of the recipe." },
        categories: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "A list of categories for the recipe (e.g., Dessert, Végétarien)."
        },
        servings: { type: Type.NUMBER, description: "The number of people this recipe serves." },
        ingredients: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Name of the ingredient." },
                    quantity: { type: Type.NUMBER, description: "Quantity of the ingredient." },
                    unit: { type: Type.STRING, description: "Unit for the quantity (e.g., g, ml, cup, tbsp)." },
                },
                required: ['name', 'quantity', 'unit'],
            },
            description: "List of ingredients for the recipe."
        },
        instructions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Step-by-step instructions to prepare the recipe."
        },
    },
    required: ['title', 'categories', 'servings', 'ingredients', 'instructions'],
};

// New schema for URL parsing that includes an image prompt
const recipeSchemaWithImagePrompt = {
    ...recipeSchema,
    properties: {
        ...recipeSchema.properties,
        imagePrompt: { 
            type: Type.STRING, 
            description: "A detailed, descriptive prompt in English for an image generation AI to create a beautiful, realistic photo of the final dish. Example: 'A steaming bowl of homemade chicken noodle soup, with fresh parsley and a side of crusty bread, on a rustic wooden table.'"
        }
    },
    required: [...recipeSchema.required, 'imagePrompt']
};


export async function parseRecipeFromImage(imagePart: { inlineData: { data: string; mimeType: string; } }, allCategories: string[]): Promise<Partial<Recipe> & { imagePrompt: string }> {
    try {
        // FIX: Use gemini-2.5-flash model for multimodal input.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    parts: [
                        imagePart,
                        { text: `Extrais les détails de la recette de cette image. Fournis la réponse au format JSON. La recette doit inclure le titre, les catégories, le nombre de portions, les ingrédients (avec nom, quantité et unité), les instructions et une invite de génération d'image (imagePrompt). Si une valeur n'est pas présente, essaie de faire une estimation raisonnable. Pour les catégories, choisis UNIQUEMENT parmi la liste suivante : ${allCategories.join(', ')}. Si aucune catégorie de la liste ne correspond, renvoie un tableau de catégories vide. La réponse doit être entièrement en français, sauf pour 'imagePrompt' qui doit être en anglais.` }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: recipeSchemaWithImagePrompt,
            },
        });
        
        // FIX: Extract text from response and parse as JSON.
        const jsonString = response.text.trim();
        const recipeData = JSON.parse(jsonString);
        
        return recipeData;

    } catch (error) {
        console.error("Error parsing recipe from image:", error);
        throw new Error("Failed to parse recipe from image. Please try again or enter the details manually.");
    }
}

export async function parseRecipeFromUrl(url: string, allCategories: string[]): Promise<Partial<Recipe> & { imagePrompt: string }> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: `Extrais les détails de la recette de l'URL suivante : ${url}. Fournis la réponse au format JSON. La recette doit inclure le titre, les catégories, le nombre de portions, les ingrédients (avec nom, quantité et unité), les instructions et une invite de génération d'image (imagePrompt). Si une valeur n'est pas présente, essaie de faire une estimation raisonnable. Pour les catégories, choisis UNIQUEMENT parmi la liste suivante : ${allCategories.join(', ')}. Si aucune catégorie de la liste ne correspond, renvoie un tableau de catégories vide. La réponse doit être entièrement en français, sauf pour 'imagePrompt' qui doit être en anglais.` }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: recipeSchemaWithImagePrompt,
            },
        });

        const jsonString = response.text.trim();
        const recipeData = JSON.parse(jsonString);
        return recipeData;
    } catch (error) {
        console.error("Error parsing recipe from URL:", error);
        throw new Error("Failed to parse recipe from URL. Please check the URL or try again.");
    }
}

export async function generateImageFromPrompt(prompt: string): Promise<string> {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        } else {
            throw new Error("Image generation failed to return an image.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate an image for the recipe.");
    }
}