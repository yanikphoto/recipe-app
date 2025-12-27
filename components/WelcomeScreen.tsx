
import React, { useState } from 'react';
import { Screen, Recipe } from '../types';
import { exportRecipesToWord } from '../services/exportService';

type WelcomeScreenProps = {
  setActiveScreen: (screen: Screen) => void;
  recipes: Recipe[];
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ setActiveScreen, recipes }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
        await exportRecipesToWord(recipes);
    } catch (error) {
        console.error("Export failed:", error);
        alert("Une erreur est survenue lors de l'exportation.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F9F9F5] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-xs">
        <img 
          src="https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=2940&auto=format&fit=crop" 
          alt="Mosaïque de plats délicieux" 
          className="w-full h-auto object-cover rounded-2xl shadow-lg"
        />
      </div>

      <h1 className="text-4xl font-bold text-gray-800 mt-4">Nos Recettes</h1>

      <div className="w-full mt-6 space-y-4 max-w-xs">
        <ActionButton onClick={() => setActiveScreen('add')}>Ajouter une recette</ActionButton>
        <ActionButton onClick={() => setActiveScreen('recipes')}>Parcourir les recettes</ActionButton>
        <ActionButton onClick={() => setActiveScreen('search')}>Chercher une recette</ActionButton>
        <ActionButton onClick={() => setActiveScreen('list')}>Liste d'épicerie</ActionButton>
        
        <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-[#D4F78F] text-gray-800 font-semibold py-4 px-6 rounded-2xl shadow-sm hover:bg-[#BDEE63] transition-all duration-200 transform hover:scale-105 text-lg flex justify-center items-center gap-2 disabled:opacity-70 disabled:scale-100"
        >
            {isExporting ? (
                <>
                    <svg className="animate-spin h-5 w-5 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Exportation...</span>
                </>
            ) : (
                <span>Exporter recettes</span>
            )}
        </button>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{onClick: () => void, children: React.ReactNode}> = ({ onClick, children }) => (
    <button
        onClick={onClick}
        className="w-full bg-[#D4F78F] text-gray-800 font-semibold py-4 px-6 rounded-2xl shadow-sm hover:bg-[#BDEE63] transition-all duration-200 transform hover:scale-105 text-lg"
    >
        {children}
    </button>
)

export default WelcomeScreen;
