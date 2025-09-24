import React from 'react';
import { Page } from '../types';

interface WelcomeScreenProps {
  onNavigate: (page: Page) => void;
  onSearchClick: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigate, onSearchClick }) => {
  return (
    <div className="flex flex-col h-full pt-6">
      <header className="px-6">
        <img 
          src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=2070&auto=format&fit=crop" 
          alt="Assortiment d'ingrédients frais pour la cuisine" 
          className="w-full h-48 object-cover rounded-2xl shadow-xl" 
        />
      </header>
      <main className="flex-grow flex flex-col items-center justify-center text-center px-8 py-6">
        <h1 className="text-4xl font-bold text-stone-800 mb-12">Nos recettes 5 ⭐</h1>
        <div className="w-full max-w-xs mx-auto space-y-4">
          <button
            onClick={() => onNavigate(Page.AddRecipe)}
            className="w-full bg-[#BDEE63] text-stone-900 font-semibold py-4 rounded-full text-lg transition-all duration-200 active:scale-95 shadow-sm hover:bg-lime-300"
          >
            Ajouter une recette
          </button>
          <button
            onClick={() => onNavigate(Page.RecipeList)}
            className="w-full bg-[#BDEE63] text-stone-900 font-semibold py-4 rounded-full text-lg transition-all duration-200 active:scale-95 shadow-sm hover:bg-lime-300"
          >
            Parcourir les recettes
          </button>
          <button
              onClick={onSearchClick}
              className="w-full bg-[#BDEE63] text-stone-900 font-semibold py-4 rounded-full text-lg transition-all duration-200 active:scale-95 shadow-sm hover:bg-lime-300"
          >
            Chercher une recette
          </button>
           <button
              onClick={() => onNavigate(Page.GroceryList)}
              className="w-full bg-[#BDEE63] text-stone-900 font-semibold py-4 rounded-full text-lg transition-all duration-200 active:scale-95 shadow-sm hover:bg-lime-300"
          >
            Liste d'épicerie
          </button>
        </div>
      </main>
    </div>
  );
};

export default WelcomeScreen;