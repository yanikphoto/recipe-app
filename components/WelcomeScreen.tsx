import React from 'react';
import { Screen } from '../types';

type WelcomeScreenProps = {
  setActiveScreen: (screen: Screen) => void;
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ setActiveScreen }) => {
  return (
    <div className="min-h-screen w-full bg-[#F9F9F5] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-xs pt-8">
        <img 
          src="https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=2940&auto=format&fit=crop" 
          alt="Mosaïque de plats délicieux" 
          className="w-full h-auto object-cover rounded-2xl shadow-lg"
        />
      </div>

      <h1 className="text-4xl font-bold text-gray-800 mt-8">Nos Recettes</h1>

      <div className="w-full mt-10 space-y-4 max-w-xs">
        <ActionButton onClick={() => setActiveScreen('add')}>Ajouter une recette</ActionButton>
        <ActionButton onClick={() => setActiveScreen('recipes')}>Parcourir les recettes</ActionButton>
        <ActionButton onClick={() => setActiveScreen('search')}>Chercher une recette</ActionButton>
        <ActionButton onClick={() => setActiveScreen('list')}>Liste d'épicerie</ActionButton>
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