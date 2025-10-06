import React, { useState } from 'react';
import { Recipe, GroceryListItem } from '../types';
import Spinner from './Spinner';

type SyncScreenProps = {
  recipes: Recipe[];
  groceryList: GroceryListItem[];
  onBack: () => void;
};

// Helper to compress a string using Gzip
const compressString = async (input: string): Promise<Uint8Array> => {
    const stream = new Blob([input], { type: 'text/plain' }).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const blob = await new Response(compressedStream).blob();
    return new Uint8Array(await blob.arrayBuffer());
};

// Helper to convert Uint8Array to standard base64 for JSON transport
const uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
};

// Helper to downscale a data URL image to reduce its size for syncing
const downscaleImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const MAX_SYNC_DIMENSION = 128; // Smaller dimension for QR code data
        const IMAGE_QUALITY = 0.7; // 70% quality JPEG compression

        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            if (width > MAX_SYNC_DIMENSION || height > MAX_SYNC_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_SYNC_DIMENSION) / width);
                    width = MAX_SYNC_DIMENSION;
                } else {
                    width = Math.round((width * MAX_SYNC_DIMENSION) / height);
                    height = MAX_SYNC_DIMENSION;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error("Impossible de créer le contexte du canevas pour le redimensionnement."));
            }
            
            ctx.drawImage(img, 0, 0, width, height);
            const newDataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
            resolve(newDataUrl);
        };
        img.onerror = (error) => reject(new Error(`Le chargement de l'image a échoué pour le redimensionnement : ${error}`));
        img.src = dataUrl;
    });
};

const SyncScreen: React.FC<SyncScreenProps> = ({ recipes, groceryList, onBack }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

    const handleGenerateQRCode = async () => {
        setIsLoading(true);
        setLoadingMessage('Préparation des données...');
        setQrCodeUrl(null);
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const recipesForSync = await Promise.all(recipes.map(async (recipe) => {
                if (recipe.imageUrl.startsWith('data:image')) {
                    try {
                        const downscaledImageUrl = await downscaleImage(recipe.imageUrl);
                        return { ...recipe, imageUrl: downscaledImageUrl };
                    } catch (e) {
                        console.error(`Impossible de réduire l'image pour la recette ${recipe.title}, l'image sera ignorée.`, e);
                        return { ...recipe, imageUrl: '' };
                    }
                }
                return recipe;
            }));

            const dataToSync = { recipes: recipesForSync, groceryList };
            const jsonString = JSON.stringify(dataToSync);
            
            setLoadingMessage('Compression des données...');
            const compressedData = await compressString(jsonString);
            const base64Data = uint8ArrayToBase64(compressedData);

            setLoadingMessage('Création du lien de synchronisation...');
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: base64Data })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `La création du lien de synchronisation a échoué (${response.status})`);
            }

            const { id } = await response.json();
            if (!id) {
                throw new Error("L'ID de synchronisation n'a pas été reçu du serveur.");
            }
            
            const syncUrl = `${window.location.origin}${window.location.pathname}?syncId=${id}`;

            setLoadingMessage('Génération du code QR...');
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(syncUrl)}`;
            
            const img = new Image();
            img.src = qrApiUrl;
            img.onload = () => {
                setQrCodeUrl(qrApiUrl);
                setIsLoading(false);
                setLoadingMessage('');
            };
            img.onerror = () => {
                throw new Error("Échec du chargement de l'image du code QR.");
            }

        } catch (error: any) {
            console.error('Échec de la génération du code QR', error);
            alert(error.message || "Échec de la génération du code QR. Les données sont peut-être trop volumineuses ou vous êtes hors ligne.");
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

  return (
    <div className="p-4 bg-[#F9F9F5] min-h-screen pb-24">
      <div className="flex items-center mb-8 relative h-10">
        <button onClick={onBack} className="p-2 absolute left-0" aria-label="Retour">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-3xl font-bold text-gray-800 text-center w-full">Synchroniser</h1>
      </div>

      <div className="max-w-md mx-auto mt-8 text-center">
        <div className="bg-white p-6 rounded-3xl shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-[#BDEE63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mt-4">Transférer vos données</h2>
            <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg mt-4">
                <strong>Attention :</strong> L'ouverture de ce lien sur un autre appareil <strong>remplacera</strong> toutes les données qui s'y trouvent.
            </p>
        </div>

        {isLoading && (
            <div className="mt-8 flex flex-col items-center justify-center">
                <Spinner />
                {loadingMessage && <p className="text-gray-600 mt-2">{loadingMessage}</p>}
            </div>
        )}

        {!isLoading && !qrCodeUrl && (
            <button
                onClick={handleGenerateQRCode}
                className="w-full mt-8 bg-[#D4F78F] text-gray-800 font-bold py-5 px-6 rounded-2xl shadow-sm hover:bg-[#BDEE63] transition-all duration-200 transform hover:scale-105 text-lg"
            >
                Générer un code QR
            </button>
        )}
        
        {!isLoading && qrCodeUrl && (
            <div className="mt-8 bg-white p-6 rounded-3xl shadow-sm flex flex-col items-center">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Scannez pour synchroniser</h3>
                <img src={qrCodeUrl} alt="QR Code de synchronisation" className="w-64 h-64 rounded-lg bg-gray-100" />
                <p className="text-gray-600 mt-4">
                    Ouvrez l'appareil photo sur votre autre appareil et pointez-le sur ce code pour importer vos données.
                </p>
                <button
                    onClick={() => setQrCodeUrl(null)}
                    className="w-full mt-6 bg-gray-200 text-gray-800 font-bold py-4 px-6 rounded-2xl hover:bg-gray-300 transition-colors text-lg"
                >
                    Terminé
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default SyncScreen;