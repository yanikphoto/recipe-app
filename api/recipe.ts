
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
        servings: { type: Type.NUMBER, description: "The number of people this recipe serves. Omit if not specified in the source." },
        servingsUnit: { type: Type.STRING, description: "The unit for the servings (e.g., 'personnes', 'portions', 'biscuits'). Optional." },
        ingredients: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Name of the ingredient, or the title of a section if isSectionHeader is true." },
                    quantity: { type: Type.NUMBER, description: "Quantity of the ingredient. Omit for section headers." },
                    unit: { type: Type.STRING, description: "Unit for the quantity (e.g., g, ml, cup, tbsp). Omit for section headers." },
                    isSectionHeader: { type: Type.BOOLEAN, description: "Set to true if this item is a section title (e.g., 'Marinade')." },
                },
                required: ['name'],
            },
            description: "List of ingredients for the recipe. Can include section headers."
        },
        instructions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Step-by-step instructions to prepare the recipe."
        },
    },
    required: ['title', 'categories', 'ingredients', 'instructions'],
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
        contents: {
            parts: [
                imagePart,
                { text: `Extrais les détails de la recette de cette image. Fournis la réponse au format JSON. La recette doit inclure le titre, les catégories, le nombre de portions (servings) et son unité (servingsUnit, ex: 'personnes'), les ingrédients (avec nom, quantité et unité), les instructions et une invite de génération d'image (imagePrompt). Pour les ingrédients, si aucune unité de mesure spécifique (comme g, tasse, c. à s.) n'est applicable (par exemple pour '1 banane'), le champ 'unit' doit être une chaîne vide. N'utilise pas de termes génériques comme 'unité'. Pour les unités d'ingrédients, conserve les abréviations françaises telles quelles (par exemple 'CS' ou 'c. à s.' pour cuillère à soupe, 'CT' ou 'c. à t.' pour cuillère à thé) et ne les traduis pas en anglais (par exemple, ne change pas 'CS' en 'tbsp'). Ne convertis pas les températures (ex: °F) présentes dans la source ; conserve l'unité de température originale sans modification. Pour les ingrédients, s'ils sont groupés en sections (par ex. 'Marinade', 'Sauce'), représente ces sections comme des éléments dans la liste d'ingrédients avec 'isSectionHeader' à true et le titre de la section dans le champ 'name'. Les ingrédients qui suivent un tel en-tête appartiennent à cette section. Si le nombre de portions n'est pas explicitement mentionné, omets les champs 'servings' et 'servingsUnit'. Pour les autres valeurs non présentes, essaie de faire une estimation raisonnable. Pour les catégories, choisis UNIQUEMENT parmi la liste suivante : ${allCategories.join(', ')}. Note : la catégorie 'Déjeuner' désigne le petit-déjeuner (le repas du matin). Si aucune catégorie de la liste ne correspond, renvoie un tableau de catégories vide. Pour le titre de la recette, mets en majuscule uniquement la première lettre du premier mot (cas de la phrase). La réponse doit être entièrement en français, sauf pour 'imagePrompt' qui doit être en anglais.` }
            ]
        },
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
        contents: `Extrais les détails de la recette de l'URL suivante : ${url}. Fournis la réponse au format JSON. La recette doit inclure le titre, les catégories, le nombre de portions (servings) et son unité (servingsUnit, ex: 'personnes'), les ingrédients (avec nom, quantité et unité), les instructions et une invite de génération d'image (imagePrompt). Pour les ingrédients, si aucune unité de mesure spécifique (comme g, tasse, c. à s.) n'est applicable (par exemple pour '1 banane'), le champ 'unit' doit être une chaîne vide. N'utilise pas de termes génériques comme 'unité'. Pour les unités d'ingrédients, conserve les abréviations françaises telles quelles (par exemple 'CS' ou 'c. à s.' pour cuillère à soupe, 'CT' ou 'c. à t.' pour cuillère à thé) et ne les traduis pas en anglais (par exemple, ne change pas 'CS' en 'tbsp'). Ne convertis pas les températures (ex: °F) présentes dans la source ; conserve l'unité de température originale sans modification. Pour les ingrédients, s'ils sont groupés en sections (par ex. 'Marinade', 'Sauce'), représente ces sections comme des éléments dans la liste d'ingrédients avec 'isSectionHeader' à true et le titre de la section dans le champ 'name'. Les ingrédients qui suivent un tel en-tête appartiennent à cette section. Si le nombre de portions n'est pas explicitement mentionné, omets les champs 'servings' et 'servingsUnit'. Pour les autres valeurs non présentes, essaie de faire une estimation raisonnable. Pour les catégories, choisis UNIQUEMENT parmi la liste suivante : ${allCategories.join(', ')}. Note : la catégorie 'Déjeuner' désigne le petit-déjeuner (le repas du matin). Si aucune catégorie de la liste ne correspond, renvoie un tableau de catégories vide. Pour le titre de la recette, mets en majuscule uniquement la première lettre du premier mot (cas de la phrase). La réponse doit être entièrement en français, sauf pour 'imagePrompt' qui doit être en anglais.`,
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
    if (!process.env.API_KEY) {
        console.error("API_KEY environment variable is not set.");
        return res.status(500).json({ error: "Configuration du serveur incomplète. La clé API est manquante." });
    }

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
        console.error(`[API Action: ${action}] Full Error:`, error);
        
        // Default message in case we can't identify the error
        let userMessage = "Une erreur est survenue lors du traitement de votre demande.";
        
        // The error from the SDK might be an object, let's stringify it for a reliable text search.
        const errorString = JSON.stringify(error);

        // Keywords indicating the Gemini model is temporarily unavailable.
        const isOverloaded = errorString.includes('503') || 
                             errorString.toLowerCase().includes('overloaded') || 
                             errorString.includes('UNAVAILABLE');

        if (isOverloaded) {
            userMessage = "Le service est actuellement très demandé. Veuillez réessayer dans quelques instants.";
        } else {
            // For developers: log the unexpected error string.
            console.error(`[API Action: ${action}] Unhandled Error String:`, errorString);
        }
    
        return res.status(500).json({ error: userMessage });
    }
}
