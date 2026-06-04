import { Recipe } from '../types';

const API_BASE_URL = 'https://deafening-gaye-yanik-dfb7fb04.koyeb.app';

async function apiCall(action: string, payload: any) {
    const response = await fetch(`${API_BASE_URL}/api/recipe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Une erreur inconnue est survenue" }));
        throw new Error(errorData.error || `L'appel API pour l'action '${action}' a échoué avec le statut ${response.status}`);
    }

    return response.json();
}

export async function parseRecipeFromImage(imagePart: { inlineData: { data: string; mimeType: string; } }, allCategories: string[]): Promise<Partial<Recipe> & { imagePrompt: string }> {
    try {
        return await apiCall('parseFromImage', { imagePart, allCategories });
    } catch (error) {
        console.error("Error parsing recipe from image:", error);
        if (error instanceof Error) throw error;
        throw new Error("Échec de l'analyse de la recette à partir de l'image. Veuillez réessayer ou entrer les détails manuellement.");
    }
}

export async function parseRecipeFromUrl(url: string, allCategories: string[]): Promise<Partial<Recipe> & { imagePrompt: string }> {
    try {
        return await apiCall('parseFromUrl', { url, allCategories });
    } catch (error) {
        console.error("Error parsing recipe from URL:", error);
        if (error instanceof Error) throw error;
        throw new Error("Échec de l'analyse de la recette à partir de l'URL. Veuillez vérifier l'URL ou réessayer.");
    }
}

export async function generateImageFromPrompt(prompt: string): Promise<string> {
    try {
        const result = await apiCall('generateImage', { prompt });
        if (result.imageBase64) {
            return result.imageBase64;
        } else {
             throw new Error("La génération d'image n'a pas retourné d'image.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        if (error instanceof Error) throw error;
        throw new Error("Échec de la génération d'une image pour la recette.");
    }
}