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

// Helper to convert Uint8Array to URL-safe base64
const uint8ArrayToUrlSafeBase64 = (uint8Array: Uint8Array): string => {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};


const SyncScreen: React.FC<SyncScreenProps> = ({ recipes, groceryList, onBack }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

    const handleGenerateQRCode = async () => {
        setIsLoading(true);
        setQrCodeUrl(null);
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const dataToSync = { recipes, groceryList };
            const jsonString = JSON.stringify(dataToSync);
            
            const compressedData = await compressString(jsonString);
            const urlSafeBase64 = uint8ArrayToUrlSafeBase64(compressedData);

            const syncUrl = `${window.location.origin}${window.location.pathname}?sync=${urlSafeBase64}`;
            
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(syncUrl)}`;
            
            // Preload image to avoid showing a broken image while it loads
            const img = new Image();
            img.src = qrApiUrl;
            img.onload = () => {
                setQrCodeUrl(qrApiUrl);
                setIsLoading(false);
            };
            img.onerror = () => {
                throw new Error("Failed to load QR code image.");
            }

        } catch (error) {
            console.error('QR Code generation failed', error);
            alert("Échec de la génération du code QR. Les données sont peut-être trop volumineuses ou vous êtes hors ligne.");
            setIsLoading(false);
        }
    };

  return (
    <div className="p-4 bg-[#F9F9F5] min-h-screen">
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
            <div className="mt-8 flex justify-center">
                <Spinner />
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