

import React, { useState, useRef } from 'react';
import { Screen, Recipe } from '../types';
import { parseRecipeFromImage, parseRecipeFromUrl, generateImageFromPrompt } from '../services/geminiService';
import Spinner from './Spinner';

const fileToGenerativePart = (file: File): Promise<{ inlineData: { data: string; mimeType: string; } }> => {
  const MAX_DIMENSION = 1024; // Max width or height for the image
  const TARGET_MIME_TYPE = 'image/jpeg';
  const IMAGE_QUALITY = 0.8; // 80% quality for JPEG compression

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error("FileReader failed to read file."));
      }
      
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate the new dimensions
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Could not create canvas context."));
        }
        
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(TARGET_MIME_TYPE, IMAGE_QUALITY);
        const base64EncodedData = dataUrl.split(',')[1];
        
        if (!base64EncodedData) {
            return reject(new Error("Could not extract base64 data from canvas."));
        }

        resolve({
          inlineData: { data: base64EncodedData, mimeType: TARGET_MIME_TYPE },
        });
      };
      
      img.onerror = (error) => reject(new Error(`Image failed to load: ${error}`));
      img.src = event.target.result as string;
    };
    reader.onerror = (error) => reject(new Error(`FileReader error: ${error}`));
    reader.readAsDataURL(file);
  });
};

const OptionButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center text-left p-5 bg-[#D4F78F] text-gray-800 font-semibold rounded-3xl shadow-sm hover:bg-[#BDEE63] transition-all duration-200 transform hover:scale-105"
    >
        <div className="w-8 mr-4 flex-shrink-0">{icon}</div>
        <span className="text-lg">{label}</span>
    </button>
);


type AddRecipeScreenProps = {
  onAddRecipe: (recipe: Recipe) => void;
  setActiveScreen: (screen: Screen) => void;
  allCategories: string[];
};

const AddRecipeScreen: React.FC<AddRecipeScreenProps> = ({ onAddRecipe, setActiveScreen, allCategories }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');
    const [urlInputVisible, setUrlInputVisible] = useState(false);
    const [recipeUrl, setRecipeUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const processAndAddRecipe = async (parsedData: Partial<Recipe> & { imagePrompt: string }) => {
        if (!parsedData.title || !parsedData.ingredients?.length || !parsedData.instructions?.length || !parsedData.imagePrompt) {
            throw new Error("Impossible d'extraire les détails complets de la recette. Veuillez essayer une autre source.");
        }

        setLoadingMessage("Génération de l'image...");
        const imageBase64 = await generateImageFromPrompt(parsedData.imagePrompt);
        const imageUrl = `data:image/jpeg;base64,${imageBase64}`;

        const newRecipe: Recipe = {
            id: crypto.randomUUID(),
            imageUrl: imageUrl,
            title: parsedData.title,
            categories: parsedData.categories || [],
            servings: parsedData.servings || 1,
            ingredients: parsedData.ingredients.map(ing => ({ ...ing, id: crypto.randomUUID() })),
            instructions: parsedData.instructions,
        };

        onAddRecipe(newRecipe);
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsLoading(true);
            setLoadingMessage('Analyse de la recette...');
            setError('');
            try {
                const imagePart = await fileToGenerativePart(file);
                const parsedData = await parseRecipeFromImage(imagePart, allCategories);
                await processAndAddRecipe(parsedData);
            } catch (err: any) {
                setError(err.message || "Une erreur s'est produite lors de l'analyse de l'image.");
            } finally {
                setIsLoading(false);
                setLoadingMessage('');
                if (event.target) {
                    event.target.value = '';
                }
            }
        }
    };
    
    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipeUrl.trim() || !recipeUrl.startsWith('http')) {
            setError("Veuillez coller une URL valide.");
            return;
        }
        
        setIsLoading(true);
        setLoadingMessage("Analyse de l'URL...");
        setError('');

        try {
            const parsedData = await parseRecipeFromUrl(recipeUrl, allCategories);
            await processAndAddRecipe(parsedData);
            setUrlInputVisible(false);
            setRecipeUrl('');
        } catch (err: any) {
            setError(err.message || "Une erreur s'est produite.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleCancelUrl = () => {
        setUrlInputVisible(false);
        setError('');
        setRecipeUrl('');
    };

    const isUrlEntered = recipeUrl.trim().length > 0;

    return (
        <div className="p-4 bg-[#F9F9F5] min-h-screen">
            {!urlInputVisible && (
                <div className="flex items-center mb-8 relative h-10">
                    <button onClick={() => setActiveScreen('recipes')} className="p-2 absolute left-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 text-center w-full">Ajouter une recette</h1>
                </div>
            )}

            <div className="max-w-md mx-auto mt-16">
                {urlInputVisible ? (
                     <div className="w-full">
                         <h2 className="text-xl font-semibold text-gray-800 text-center mb-6">Collez l'URL de la recette</h2>
                         <form onSubmit={handleUrlSubmit}>
                             <input
                                 type="url"
                                 value={recipeUrl}
                                 onChange={(e) => setRecipeUrl(e.target.value)}
                                 placeholder="https://www.example.com/rec"
                                 className="w-full p-4 text-gray-700 bg-white border border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#BDEE63] text-lg"
                                 autoFocus
                             />
                             <div className="mt-8 space-y-4">
                                 <button
                                     type="submit"
                                     disabled={isLoading || !isUrlEntered}
                                     className={`w-full text-gray-800 font-bold py-4 px-6 rounded-2xl shadow-sm transition-colors text-lg disabled:opacity-50 ${isUrlEntered ? 'bg-[#D4F78F] hover:bg-[#BDEE63]' : 'bg-gray-200'}`}
                                 >
                                     Générer la recette
                                 </button>
                                 <button
                                     type="button"
                                     onClick={handleCancelUrl}
                                     disabled={isLoading}
                                     className="w-full bg-white text-gray-800 font-bold py-4 px-6 rounded-2xl shadow-sm hover:bg-gray-100 transition-colors text-lg"
                                 >
                                     Annuler
                                 </button>
                             </div>
                         </form>
                         {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                     </div>
                ) : (
                    <div className="space-y-4">
                        <OptionButton 
                            label="Prendre une photo" 
                            onClick={() => cameraInputRef.current?.click()}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>}
                        />
                        <OptionButton 
                            label="Télécharger une image" 
                            onClick={() => fileInputRef.current?.click()}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>}
                        />
                        <OptionButton 
                            label="Ajouter un URL" 
                            onClick={() => setUrlInputVisible(true)}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>}
                        />
                        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                    </div>
                )}
            </div>

            <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" ref={cameraInputRef} />
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" ref={fileInputRef} />
            
            {isLoading && (
                <div className="fixed inset-0 bg-black/30 flex flex-col items-center justify-center z-50">
                    <Spinner />
                    <p className="text-white mt-2">{loadingMessage}</p>
                </div>
            )}
        </div>
    );
};

export default AddRecipeScreen;