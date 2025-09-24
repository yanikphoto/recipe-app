import React, { useRef, useState } from 'react';
import { BackIcon, CameraIcon, UploadIcon, LinkIcon } from '../constants';
import Spinner from './Spinner';

interface AddRecipeScreenProps {
  onBack: () => void;
  onRecipeGenerated: (file: File) => void;
  onRecipeGeneratedFromUrl: (url: string) => void;
  isLoading: boolean;
}

const AddRecipeScreen: React.FC<AddRecipeScreenProps> = ({ onBack, onRecipeGenerated, onRecipeGeneratedFromUrl, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onRecipeGenerated(event.target.files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (url && url.trim() !== '') {
      onRecipeGeneratedFromUrl(url);
    }
  };

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <Spinner />
              <p className="mt-4 text-stone-600">Analyse de votre image...</p>
              <p className="mt-2 text-sm text-stone-500 max-w-xs">
                Nous générons la recette. Si l'image fournie est une capture d'écran, nous créerons également une nouvelle photo de plat pour vous. Cela peut prendre un moment.
              </p>
          </div>
      )
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <header className="flex items-center mb-12">
        <button onClick={showUrlInput ? () => setShowUrlInput(false) : onBack} className="p-2 -ml-2">
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold text-stone-800 ml-4">Ajouter une recette</h1>
      </header>
      
      <main className="flex-grow flex flex-col justify-center">
        {showUrlInput ? (
          <div className="w-full space-y-6">
            <div>
              <label htmlFor="url-input" className="block text-sm font-medium text-stone-700 mb-2">
                Collez l'URL de la recette
              </label>
              <input
                type="url"
                id="url-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.example.com/recipe"
                className="w-full bg-white px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#BDEE63] focus:border-[#BDEE63] transition"
                autoFocus
              />
            </div>
            <div className="space-y-4">
              <button
                onClick={handleUrlSubmit}
                disabled={!url.trim()}
                className="w-full bg-[#BDEE63] text-stone-900 font-semibold py-4 px-6 rounded-full text-lg flex items-center justify-center transition-transform active:scale-95 shadow-sm disabled:bg-stone-200 disabled:text-stone-500 disabled:cursor-not-allowed"
              >
                Générer la recette
              </button>
              <button
                onClick={() => setShowUrlInput(false)}
                className="w-full bg-white text-stone-900 font-semibold py-4 px-6 rounded-full text-lg flex items-center justify-center transition-transform active:scale-95 border border-stone-200"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={cameraInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full bg-[#BDEE63] text-stone-900 font-semibold py-4 px-6 rounded-full text-lg flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm hover:bg-lime-300"
            >
              <CameraIcon /> Prendre une photo
            </button>

            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-[#BDEE63] text-stone-900 font-semibold py-4 px-6 rounded-full text-lg flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm hover:bg-lime-300"
            >
              <UploadIcon /> Télécharger une image
            </button>
            <button
              onClick={() => setShowUrlInput(true)}
              className="w-full bg-[#BDEE63] text-stone-900 font-semibold py-4 px-6 rounded-full text-lg flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm hover:bg-lime-300"
            >
              <LinkIcon /> Ajouter un URL
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AddRecipeScreen;