import { Recipe } from '../types';

async function apiCall(action: string, payload: any) {
    const response = await fetch('/api/recipe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "An unknown error occurred" }));
        throw new Error(errorData.error || `API call for action '${action}' failed with status ${response.status}`);
    }

    return response.json();
}

export async function parseRecipeFromImage(imagePart: { inlineData: { data: string; mimeType: string; } }, allCategories: string[]): Promise<Partial<Recipe> & { imagePrompt: string }> {
    try {
        return await apiCall('parseFromImage', { imagePart, allCategories });
    } catch (error) {
        console.error("Error parsing recipe from image:", error);
        throw new Error("Failed to parse recipe from image. Please try again or enter the details manually.");
    }
}

export async function parseRecipeFromUrl(url: string, allCategories: string[]): Promise<Partial<Recipe> & { imagePrompt: string }> {
    try {
        return await apiCall('parseFromUrl', { url, allCategories });
    } catch (error) {
        console.error("Error parsing recipe from URL:", error);
        throw new Error("Failed to parse recipe from URL. Please check the URL or try again.");
    }
}

export async function generateImageFromPrompt(prompt: string): Promise<string> {
    try {
        const result = await apiCall('generateImage', { prompt });
        if (result.imageBase64) {
            return result.imageBase64;
        } else {
             throw new Error("Image generation failed to return an image.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate an image for the recipe.");
    }
}
