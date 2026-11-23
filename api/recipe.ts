
import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAiClient() {
    if (!aiInstance) {
        const apiKey = process.env.GEMINI_API_KEY || 
                       process.env.API_KEY || 
                       process.env.GOOGLE_API_KEY || 
                       process.env.GOOGLE_GENAI_API_KEY;
        if (!apiKey) {
            throw new Error("Missing API key (GEMINI_API_KEY, API_KEY, GOOGLE_API_KEY, or GOOGLE_GENAI_API_KEY)");
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
        title: { type: Type.STRING, description: "The title of the recipe in French (sentence case)." },
        categories: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "A list of categories for the recipe."
        },
        servings: { type: Type.NUMBER, description: "Number of servings." },
        servingsUnit: { type: Type.STRING, description: "Unit (e.g., personnes, portions)." },
        ingredients: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Ingredient name translated to French." },
                    quantity: { type: Type.NUMBER, description: "Numeric quantity. Omit if not specified or unmeasured." },
                    unit: { type: Type.STRING, description: "Unit in French (e.g. tasse, c. à s., c. à t., g, ml). Empty string if none." },
                    isSectionHeader: { type: Type.BOOLEAN },
                },
                required: ['name'],
            }
        },
        instructions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Step-by-step instructions in French."
        },
        imagePrompt: { type: Type.STRING, description: "English prompt for professional food photography." }
    },
    required: ['title', 'categories', 'ingredients', 'instructions', 'imagePrompt'],
};

async function generateWithFallback(contents: any, schema: any) {
    const ai = getAiClient();
    const candidateModels = [
        'gemini-3.5-flash-lite',
        'gemini-3.7-flash',
        'gemini-flash-latest',
        'gemini-2.5-flash'
    ];
    let lastError: any = null;

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
        } catch (err: any) {
            console.warn(`Model ${model} failed, trying fallback:`, err?.message || err);
            lastError = err;
        }
    }
    throw lastError || new Error("Échec de l'extraction avec les modèles disponibles.");
}

async function parseRecipeFromImageInternal(imagePart: { inlineData: { data: string; mimeType: string; } }, allCategories: string[]) {
    const contents = {
        parts: [
            imagePart,
            { text: `Extrais les détails de la recette de cette image. Fournis la réponse au format JSON. La recette doit inclure le titre, les catégories, le nombre de portions (servings) et son unité (servingsUnit, ex: 'personnes'), les ingrédients (avec nom, quantité et unité), les instructions et une invite de génération d'image (imagePrompt).

Règles de traduction :
- Si la recette source est en anglais ou dans une autre langue, traduis obligatoirement et intégralement le titre, chaque nom d'ingrédient, les unités (ex: 'cups' -> 'tasses', 'tbsp' -> 'c. à s.', 'tsp' -> 'c. à t.') et toutes les étapes de préparation en français courant et naturel (ex: 'all-purpose flour' -> 'farine tout-usage', 'baking powder' -> 'poudre à pâte', 'baking soda' -> 'bicarbonate de soude', 'shortening' -> 'graisse végétale', 'heavy cream' -> 'crème 35%'). Ne laisse aucun terme en anglais dans la recette.

Règles pour les ingrédients :
- Pour les unités d'ingrédients, utilise les abréviations françaises courantes : 'tasse' ou 'tasses', 'c. à s.' pour cuillère à soupe, 'c. à t.' pour cuillère à thé, 'g', 'ml', 'lb', 'oz'.
- Si aucune unité de mesure spécifique (comme g, tasse, c. à s.) n'est applicable (par exemple pour '1 banane' ou '2 œufs'), le champ 'unit' doit être une chaîne vide "". N'utilise pas de termes génériques comme 'unité'.
- Pour les ingrédients sans quantité chiffrée précise (par exemple 'sel et poivre au goût', 'huile pour la cuisson', 'une pincée de cannelle'), ne mets pas 0 : omets simplement le champ 'quantity' (laisse-le vide) et intègre la précision dans le nom si nécessaire.
- Conserve les abréviations françaises telles quelles et ne les traduis pas en anglais (par exemple, ne change pas 'c. à s.' en 'tbsp').
- Ne convertis pas les températures (ex: °F) présentes dans la source ; conserve l'unité de température originale sans modification.
- Si les ingrédients sont groupés en sections (par ex. 'Marinade', 'Sauce'), représente ces sections comme des éléments dans la liste d'ingrédients avec 'isSectionHeader' à true et le titre de la section dans le champ 'name'. Les ingrédients qui suivent un tel en-tête appartiennent à cette section.

Règles générales :
- Si le nombre de portions n'est pas explicitement mentionné, omets les champs 'servings' et 'servingsUnit'. Pour les autres valeurs non présentes, essaie de faire une estimation raisonnable.
- Pour les catégories, choisis UNIQUEMENT parmi la liste suivante : ${allCategories.join(', ')}. Note : la catégorie 'Déjeuner' désigne le petit-déjeuner (le repas du matin). Si aucune catégorie de la liste ne correspond, renvoie un tableau de catégories vide.
- Pour le titre de la recette, mets en majuscule uniquement la première lettre du premier mot (cas de la phrase).
- Pour 'imagePrompt', écris une description photographique culinaire détaillée en anglais pour un modèle de génération d'image : photographie culinaire professionnelle en gros plan (close-up food photography, appetizing plating and presentation, soft natural warm lighting, shallow depth of field, 8k resolution, food magazine quality), sans texte, sans typographie et sans personnes.
- La réponse doit être entièrement en français, sauf pour 'imagePrompt' qui doit être en anglais.` }
        ]
    };
    return generateWithFallback(contents, recipeSchema);
}

async function parseRecipeFromUrlInternal(url: string, allCategories: string[]) {
    const contents = `Extrais les détails de la recette de l'URL suivante : ${url}. Fournis la réponse au format JSON. La recette doit inclure le titre, les catégories, le nombre de portions (servings) et son unité (servingsUnit, ex: 'personnes'), les ingrédients (avec nom, quantité et unité), les instructions et une invite de génération d'image (imagePrompt).

Règles de traduction :
- Si la recette source est en anglais ou dans une autre langue, traduis obligatoirement et intégralement le titre, chaque nom d'ingrédient, les unités (ex: 'cups' -> 'tasses', 'tbsp' -> 'c. à s.', 'tsp' -> 'c. à t.') et toutes les étapes de préparation en français courant et naturel (ex: 'all-purpose flour' -> 'farine tout-usage', 'baking powder' -> 'poudre à pâte', 'baking soda' -> 'bicarbonate de soude', 'shortening' -> 'graisse végétale', 'heavy cream' -> 'crème 35%'). Ne laisse aucun terme en anglais dans la recette.

Règles pour les ingrédients :
- Pour les unités d'ingrédients, utilise les abréviations françaises courantes : 'tasse' ou 'tasses', 'c. à s.' pour cuillère à soupe, 'c. à t.' pour cuillère à thé, 'g', 'ml', 'lb', 'oz'.
- Si aucune unité de mesure spécifique (comme g, tasse, c. à s.) n'est applicable (par exemple pour '1 banane' ou '2 œufs'), le champ 'unit' doit être une chaîne vide "". N'utilise pas de termes génériques comme 'unité'.
- Pour les ingrédients sans quantité chiffrée précise (par exemple 'sel et poivre au goût', 'huile pour la cuisson', 'une pincée de cannelle'), ne mets pas 0 : omets simplement le champ 'quantity' (laisse-le vide) et intègre la précision dans le nom si nécessaire.
- Conserve les abréviations françaises telles quelles et ne les traduis pas en anglais (par exemple, ne change pas 'c. à s.' en 'tbsp').
- Ne convertis pas les températures (ex: °F) présentes dans la source ; conserve l'unité de température originale sans modification.
- Si les ingrédients sont groupés en sections (par ex. 'Marinade', 'Sauce'), représente ces sections comme des éléments dans la liste d'ingrédients avec 'isSectionHeader' à true et le titre de la section dans le champ 'name'. Les ingrédients qui suivent un tel en-tête appartiennent à cette section.

Règles générales :
- Si le nombre de portions n'est pas explicitement mentionné, omets les champs 'servings' et 'servingsUnit'. Pour les autres valeurs non présentes, essaie de faire une estimation raisonnable.
- Pour les catégories, choisis UNIQUEMENT parmi la liste suivante : ${allCategories.join(', ')}. Note : la catégorie 'Déjeuner' désigne le petit-déjeuner (le repas du matin). Si aucune catégorie de la liste ne correspond, renvoie un tableau de catégories vide.
- Pour le titre de la recette, mets en majuscule uniquement la première lettre du premier mot (cas de la phrase).
- Pour 'imagePrompt', écris une description photographique culinaire détaillée en anglais pour un modèle de génération d'image : photographie culinaire professionnelle en gros plan (close-up food photography, appetizing plating and presentation, soft natural warm lighting, shallow depth of field, 8k resolution, food magazine quality), sans texte, sans typographie et sans personnes.
- La réponse doit être entièrement en français, sauf pour 'imagePrompt' qui doit être en anglais.`;
    return generateWithFallback(contents, recipeSchema);
}

async function generateImageFromPromptInternal(prompt: string) {
    const ai = getAiClient();
    
    // 1. Try recommended Gemini multimodal image generation models
    const geminiImageModels = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image'];
    for (const model of geminiImageModels) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: { parts: [{ text: prompt }] },
                config: { imageConfig: { aspectRatio: '1:1' } },
            });
            const parts = response.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.inlineData?.data) {
                    return part.inlineData.data;
                }
            }
        } catch (err: any) {
            console.warn(`Gemini image model ${model} failed, trying next:`, err?.message || err);
        }
    }

    // 2. Fallback to Imagen models
    const imageModels = ['imagen-3.0-generate-002', 'imagen-3.0-generate-001'];
    for (const model of imageModels) {
        try {
            const response = await ai.models.generateImages({
                model,
                prompt: prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
            });
            if (response.generatedImages?.[0]?.image?.imageBytes) {
                return response.generatedImages[0].image.imageBytes;
            }
        } catch (err: any) {
            console.warn(`Imagen model ${model} failed, trying fallback:`, err?.message || err);
        }
    }
    throw new Error("Generation failed");
}

export default async function handler(req: any, res: any) {
    const apiKey = process.env.GEMINI_API_KEY || 
                   process.env.API_KEY || 
                   process.env.GOOGLE_API_KEY || 
                   process.env.GOOGLE_GENAI_API_KEY;
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

