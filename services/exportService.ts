
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { Recipe } from "../types";
import { numberToFraction } from "./fractionUtils";

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
