// FIX: Replace placeholder with a functional RecipeListScreen component.
import React from 'react';
import { Recipe } from '../types';

type RecipeListScreenProps = {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onDeleteRequest: (id: string) => void;
};

// FIX: Define props as a separate type for RecipeCard to fix key prop error.
type RecipeCardProps = {
  recipe: Recipe;
  onSelect: () => void;
  onDelete: () => void;
};

// FIX: Changed component definition to use React.FC to correctly type props and resolve key error.
const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onSelect, onDelete }) => (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-200" onClick={onSelect}>
        <div className="relative">
            <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-40 object-cover" />
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow-md hover:bg-white transition-colors"
                aria-label="Supprimer la recette"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <div className="p-4">
            <h3 className="font-bold text-lg text-gray-800 truncate">{recipe.title}</h3>
            <div className="flex flex-wrap gap-1 mt-2">
                {recipe.categories.slice(0, 2).map(cat => (
                    <span key={cat} className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{cat}</span>
                ))}
            </div>
        </div>
    </div>
);


const RecipeListScreen: React.FC<RecipeListScreenProps> = ({ recipes, onSelectRecipe, onDeleteRequest }) => {
  return (
    <div className="p-4 bg-[#F9F9F5] min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 px-2 text-center">Mes recettes</h1>
      {recipes.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
            {recipes.map(recipe => (
                <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                    onSelect={() => onSelectRecipe(recipe)}
                    onDelete={() => onDeleteRequest(recipe.id)}
                />
            ))}
        </div>
      ) : (
        <div className="text-center py-20">
            <p className="text-gray-500">Aucune recette trouvée.</p>
            <p className="text-gray-500">Ajoutez-en une pour commencer !</p>
        </div>
      )}
    </div>
  );
};

export default RecipeListScreen;