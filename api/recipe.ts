import { GoogleGenAI, Type } from "@google/genai";

// This function runs on the server, so it can safely use environment variables.
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

async function parseRecipeFromImageInternal(imagePart: { inlineData: { data: string; mimeType: string; } }, allCategories: string[]) {
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
    
    const jsonString = response.text.trim();
    if (!jsonString) {
        throw new Error("La réponse de l'API était vide.");
    }
    return JSON.parse(jsonString);
}

async function parseRecipeFromUrlInternal(url: string, allCategories: string[]) {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: `Extrais les détails de la recette de l'URL suivante : ${url}. Fournis la réponse au format JSON. La recette doit inclure le titre, les catégories, le nombre de portions, les ingrédients (avec nom, quantité et unité), les instructions et une invite de génération d'image (imagePrompt). Si une valeur n'est pas présente, essaie de faire une estimation raisonnable. Pour les catégories, choisis UNIQUEMENT parmi la liste suivante : ${allCategories.join(', ')}. Si aucune catégorie de la liste ne correspond, renvoie un tableau de catégories vide. La réponse doit être entièrement en français, sauf pour 'imagePrompt' qui doit être en anglais.` }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: recipeSchemaWithImagePrompt,
        },
    });

    const jsonString = response.text.trim();
    if (!jsonString) {
        throw new Error("La réponse de l'API était vide.");
    }
    return JSON.parse(jsonString);
}


async function generateImageFromPromptInternal(prompt: string) {
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
}


export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { action, payload } = req.body;

    try {
        switch (action) {
            case 'parseFromImage':
                const recipeData = await parseRecipeFromImageInternal(payload.imagePart, payload.allCategories);
                return res.status(200).json(recipeData);
            
            case 'parseFromUrl':
                const urlRecipeData = await parseRecipeFromUrlInternal(payload.url, payload.allCategories);
                return res.status(200).json(urlRecipeData);

            case 'generateImage':
                const imageBase64 = await generateImageFromPromptInternal(payload.prompt);
                return res.status(200).json({ imageBase64 });

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error: any) {
        console.error(`Error in action '${action}':`, error);
        return res.status(500).json({ error: `An internal server error occurred. Please check the function logs.` });
    }
}
