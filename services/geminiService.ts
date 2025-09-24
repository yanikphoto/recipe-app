import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_CATEGORIES } from "../constants";
import { Recipe, Ingredient, Instruction } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Le nom du plat en français." },
    categories: {
      type: Type.ARRAY,
      description: `Une ou plusieurs catégories pertinentes pour la recette, choisies exclusivement dans cette liste : ${DEFAULT_CATEGORIES.join(", ")}. Si aucune ne correspond, retourne un tableau vide.`,
      items: { type: Type.STRING }
    },
    ingredients: {
      type: Type.ARRAY,
      description: "La liste des ingrédients en français, incluant les quantités. Chaque élément est une chaîne de caractères.",
      items: { type: Type.STRING }
    },
    instructions: {
      type: Type.ARRAY,
      description: "Les instructions de préparation étape par étape, en français. Chaque élément est une chaîne de caractères.",
      items: { type: Type.STRING }
    },
    is_low_quality_image: {
        type: Type.BOOLEAN,
        description: "Vrai si l'image est une capture d'écran, une photo de mauvaise qualité, ou si elle contient du texte ou des éléments d'interface qui ne font pas partie du plat. Faux si c'est une photo de bonne qualité du plat."
    }
  },
  required: ["name", "categories", "ingredients", "instructions", "is_low_quality_image"]
};

export async function generateRecipeFromImage(base64Image: string, mimeType: string, imageUrl: string): Promise<Recipe> {
    try {
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType,
            },
        };

        const textPart = {
            text: `Analyse cette image d'un plat et évalue sa qualité.
1. Génère une recette complète (nom, ingrédients, instructions, catégories) en français. Les catégories doivent provenir de cette liste : ${DEFAULT_CATEGORIES.join(", ")}.
2. Évalue l'image. Si c'est une capture d'écran, une photo de mauvaise qualité (floue, mal éclairée), ou si elle contient du texte ou des éléments d'interface utilisateur, considère-la de mauvaise qualité.
3. Retourne le résultat au format JSON, en incluant un booléen \`is_low_quality_image\` qui est vrai si l'image est de mauvaise qualité, et faux sinon.`
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const jsonString = response.text;
        const generatedData = JSON.parse(jsonString);
        
        let finalImageUrl = imageUrl;
        if (generatedData.is_low_quality_image) {
            console.log(`Image de basse qualité détectée pour "${generatedData.name}". Génération d'une nouvelle image.`);
            try {
                finalImageUrl = await generateImageForRecipe(generatedData.name);
            } catch (imageError) {
                console.error("Échec de la génération de l'image de remplacement. Utilisation de l'originale.", imageError);
            }
        }

        const newRecipe: Recipe = {
            id: `recipe-${Date.now()}`,
            name: generatedData.name || "Recette sans nom",
            imageUrl: finalImageUrl,
            categories: generatedData.categories || [],
            ingredients: (generatedData.ingredients || []).map((text: string): Ingredient => ({ text, checked: false })),
            instructions: (generatedData.instructions || []).map((text: string): Instruction => ({ text, checked: false })),
        };

        return newRecipe;

    } catch (error) {
        console.error("Error generating recipe from image:", error);
        throw new Error("Impossible de générer la recette à partir de l'image. Veuillez réessayer.");
    }
}

async function generateImageForRecipe(recipeName: string): Promise<string> {
    try {
        console.log(`Generating image for: ${recipeName}`);
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `Une photo de style culinaire, appétissante et professionnelle de "${recipeName}". Arrière-plan simple et lumineux.`,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '4:3',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        } else {
            console.warn(`Image generation failed for "${recipeName}", falling back to placeholder.`);
            return `https://picsum.photos/seed/${encodeURIComponent(recipeName)}/800/600`;
        }
    } catch (error) {
        console.error(`Error generating image for ${recipeName}:`, error);
        return `https://picsum.photos/seed/${encodeURIComponent(recipeName)}/800/600`;
    }
}

export async function generateRecipeFromUrl(url: string): Promise<Recipe> {
    try {
        const prompt = `Analyse le contenu de la page web à l'URL suivante, trouvée via la recherche Google : ${url}.
Ton objectif est d'extraire les informations d'une recette et de les retourner dans un format JSON spécifique en français.

Voici tes instructions, suis-les à la lettre :
1.  **Extraction Précise** : Identifie les éléments suivants de la recette sur la page :
    - Le nom de la recette.
    - L'URL de l'image principale de la recette. C'est crucial. Cherche bien un tag \`<img>\` ou une propriété CSS \`background-image\` qui correspond à la photo du plat.
    - La liste complète des ingrédients, AVEC LES QUANTITÉS EXACTES.
    - Les instructions de préparation, étape par étape.
2.  **Règle Stricte pour les Données** : Ne modifie, n'ajoute, ni ne supprime AUCUN ingrédient ou étape de la liste originale. Tu dois copier les quantités, les noms des ingrédients et les instructions TELS QU'ILS APPARAISSENT sur le site source.
3.  **Traduction** : SEULEMENT APRÈS avoir extrait fidèlement les informations, traduis le nom, les ingrédients et les instructions en français.
4.  **Catégorisation** : Choisis une ou plusieurs catégories pertinentes pour la recette dans la liste suivante : ${DEFAULT_CATEGORIES.join(", ")}.

Formate ta réponse UNIQUEMENT comme un objet JSON valide, sans aucun autre texte avant ou après. La structure doit être exactement comme suit :
{
  "name": "Nom de la recette traduit en français",
  "imageUrl": "URL de l'image principale (si trouvée, sinon null)",
  "categories": ["Catégorie 1", "Catégorie 2"],
  "ingredients": [
    "Quantité et nom du premier ingrédient, traduit en français",
    "Quantité et nom du deuxième ingrédient, traduit en français"
  ],
  "instructions": [
    "Première étape des instructions, traduite en français",
    "Deuxième étape des instructions, traduite en français"
  ]
}

Si tu ne trouves absolument aucune recette sur la page, renvoie ce JSON et rien d'autre : {"error": "Aucune recette trouvée sur cette page."}`;

        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart] },
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        let jsonString = response.text;
        
        const jsonMatch = jsonString.match(/```(json)?([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[2]) {
            jsonString = jsonMatch[2].trim();
        } else {
            jsonString = jsonString.trim();
        }

        const generatedData = JSON.parse(jsonString);

        if (generatedData.error) {
            throw new Error("La page ne semble pas contenir de recette valide.");
        }
        
        let imageUrl = generatedData.imageUrl;

        // Plan B: Si l'URL de l'image n'est pas trouvée ou est invalide, on en génère une.
        if (!imageUrl || !imageUrl.startsWith('http')) {
            console.log(`URL d'image non trouvée pour "${generatedData.name}". Génération d'une nouvelle image.`);
            imageUrl = await generateImageForRecipe(generatedData.name || "Plat délicieux");
        }

        const newRecipe: Recipe = {
            id: `recipe-${Date.now()}`,
            name: generatedData.name || "Recette sans nom",
            imageUrl: imageUrl,
            categories: generatedData.categories || [],
            ingredients: (generatedData.ingredients || []).map((text: string): Ingredient => ({ text, checked: false })),
            instructions: (generatedData.instructions || []).map((text: string): Instruction => ({ text, checked: false })),
        };

        return newRecipe;

    } catch (error) {
        console.error("Error generating recipe from URL:", error);
         if (error instanceof SyntaxError) {
             throw new Error("Impossible d'analyser la recette depuis l'URL. Le format de la réponse du modèle était inattendu.");
        }
        throw new Error("Impossible de générer la recette à partir de l'URL. Vérifiez le lien ou réessayez.");
    }
}