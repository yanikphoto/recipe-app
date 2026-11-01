
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { Recipe, GroceryListItem } from "../types";
import { numberToFraction } from "./fractionUtils";
import { imageStore } from "./imageStore";

const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const API_BASE_URL = 'https://deafening-gaye-yanik-dfb7fb04.koyeb.app';

export const exportBackupJsonWithShare = async (recipes: Recipe[], groceryList: GroceryListItem[] = []) => {
    if (recipes.length === 0 && groceryList.length === 0) {
        alert("Aucune recette ou donnée à sauvegarder.");
        return;
    }

    // 1. Gather all recipes with their full image data so the backup is 100% self-contained
    const recipesWithImages = await Promise.all(
        recipes.map(async (recipe) => {
            let imageBase64 = recipe.imageBase64;
            if (!imageBase64 && recipe.imageUrl) {
                if (recipe.imageUrl.startsWith('data:')) {
                    imageBase64 = recipe.imageUrl;
                } else if (!recipe.imageUrl.startsWith('http')) {
                    try {
                        const blob = await imageStore.getImage(recipe.imageUrl);
                        if (blob instanceof Blob) {
                            imageBase64 = await blobToDataUrl(blob);
                        } else if (typeof blob === 'string') {
                            imageBase64 = blob;
                        } else {
                            // Fallback to server if not found in local indexedDB
                            try {
                                const resp = await fetch(`${API_BASE_URL}/uploads/${recipe.imageUrl}.jpg`);
                                if (resp.ok) {
                                    const serverBlob = await resp.blob();
                                    imageBase64 = await blobToDataUrl(serverBlob);
                                }
                            } catch (err) {
                                console.warn(`Could not fetch remote image for ${recipe.title}`, err);
                            }
                        }
                    } catch (e) {
                        console.warn(`Could not load image for recipe ${recipe.title}`, e);
                    }
                }
            }
            return {
                ...recipe,
                ...(imageBase64 ? { imageBase64 } : {})
            };
        })
    );

    const backupData = {
        version: "1.0",
        appName: "Nos Recettes",
        exportDate: new Date().toISOString(),
        recipeCount: recipesWithImages.length,
        groceryCount: groceryList.length,
        recipes: recipesWithImages,
        groceryList,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `sauvegarde-recettes-${dateStr}.json`;

    // 1. Always download the backup file directly to the device/computer
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    // 2. Also open Web Share sheet if available (mobile/email)
    if (navigator.canShare) {
        try {
            const file = new File([jsonString], fileName, { type: "application/json" });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Sauvegarde de mes Recettes',
                    text: `Voici la sauvegarde complète de mes recettes (${recipesWithImages.length} recettes) pour Firestore.`,
                });
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.log("Share skipped or not supported:", error);
            }
        }
    }
};

export const exportRecipesToWord = async (recipes: Recipe[]) => {
    if (recipes.length === 0) {
        alert("Aucune recette à exporter.");
        return;
    }

    const docChildren = [];

    // Title Page
    docChildren.push(
        new Paragraph({
            text: "Mes Recettes de Famille",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        })
    );

    recipes.forEach((recipe, index) => {
        // Recipe Title
        docChildren.push(
            new Paragraph({
                text: recipe.title,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
            })
        );

        // Metadata (Servings / Categories)
        const metaText = [];
        if (recipe.servings) {
            metaText.push(`Portions: ${recipe.servings} ${recipe.servingsUnit || ''}`);
        }
        if (recipe.categories.length > 0) {
            metaText.push(`Catégories: ${recipe.categories.join(', ')}`);
        }
        
        if (metaText.length > 0) {
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: metaText.join(' | '),
                            italics: true,
                            color: "666666"
                        })
                    ],
                    spacing: { after: 200 }
                })
            );
        }

        // Ingredients Header
        docChildren.push(
            new Paragraph({
                text: "Ingrédients",
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 100 },
            })
        );

        // Ingredients List
        recipe.ingredients.forEach(ing => {
            if (ing.isSectionHeader) {
                 docChildren.push(
                    new Paragraph({
                        children: [new TextRun({ text: ing.name, bold: true })],
                        spacing: { before: 100, after: 50 },
                    })
                );
            } else {
                const quantity = ing.quantity ? `${numberToFraction(ing.quantity)} ` : '';
                const text = `${quantity}${ing.unit || ''} ${ing.name}`.trim();
                docChildren.push(
                    new Paragraph({
                        text: `• ${text}`,
                        spacing: { after: 50 },
                        indent: { left: 400 } // Indent for bullet effect
                    })
                );
            }
        });

        // Instructions Header
        docChildren.push(
            new Paragraph({
                text: "Préparation",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
            })
        );

        // Instructions List
        recipe.instructions.forEach((step, i) => {
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: `${i + 1}. `, bold: true }),
                        new TextRun({ text: step })
                    ],
                    spacing: { after: 100 }
                })
            );
        });

        // Separator Line (except for last item)
        if (index < recipes.length - 1) {
            docChildren.push(
                new Paragraph({
                    text: "",
                    border: {
                        bottom: {
                            color: "auto",
                            space: 1,
                            style: BorderStyle.SINGLE,
                            size: 6,
                        },
                    },
                    spacing: { before: 400, after: 400 },
                })
            );
        }
    });

    const doc = new Document({
        sections: [
            {
                properties: {},
                children: docChildren,
            },
        ],
    });

    // Generate Blob
    const blob = await Packer.toBlob(doc);
    const fileName = "mes-recettes.docx";

    // Try Web Share API first (Mobile preferred for direct email attachment)
    const file = new File([blob], fileName, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'Mes Recettes',
                text: 'Voici un document contenant mes recettes de famille.',
            });
            return;
        } catch (error) {
            console.log("Sharing failed or was cancelled, falling back to download.", error);
        }
    }

    // Fallback: Direct Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Slight delay to allow download to start before revoking
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
