import React from 'react';
import { Recipe } from '../types';
import { DeleteRecipeIcon } from '../constants';

interface RecipeListScreenProps {
  recipes: Recipe[];
  onViewRecipe: (recipe: Recipe) => void;
  onNavigateToAdd: () => void;
  onDeleteRecipe: (recipe: Recipe) => void;
  activeCategory: string | null;
  onClearFilter: () => void;
  allCategories: string[];
  onCategorySelect: (category: string) => void;
}

const RecipeListScreen: React.FC<RecipeListScreenProps> = ({ recipes, onViewRecipe, onNavigateToAdd, onDeleteRecipe, activeCategory, onClearFilter, allCategories, onCategorySelect }) => {
  return (
    <div className="p-6 pb-24">
       <h1 className="text-3xl font-bold text-stone-800 mb-2">
          {activeCategory ? `Catégorie : ${activeCategory}` : 'Recettes'}
        </h1>
      {activeCategory && (
        <button 
          onClick={onClearFilter}
          className="text-sm text-stone-500 hover:text-stone-800 font-medium mb-6 flex items-center group"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1.5 group-hover:rotate-90 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Effacer le filtre
        </button>
      )}

      {!activeCategory && allCategories.length > 0 && (
        <div className="my-6 bg-lime-100/60 p-4 rounded-2xl border border-lime-200/80">
          <h2 className="text-sm font-semibold text-lime-900/80 mb-3 uppercase tracking-wider">Catégories</h2>
          <div className="flex flex-wrap gap-2">
            {allCategories.map(category => (
              <button
                key={category}
                onClick={() => onCategorySelect(category)}
                className="bg-white/80 text-stone-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-white transition-colors shadow-sm border border-stone-200/50 active:scale-95"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="text-center py-20">
            <p className="text-stone-500 mb-4">{activeCategory ? `Aucune recette trouvée dans la catégorie "${activeCategory}".` : "Vous n'avez pas encore de recettes."}</p>
            <button
                onClick={onNavigateToAdd}
                className="bg-[#BDEE63] text-stone-900 font-semibold py-3 px-6 rounded-full transition-transform active:scale-95 shadow-sm"
            >
                {activeCategory ? 'Ajouter une nouvelle recette' : 'Ajouter votre première recette'}
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => onViewRecipe(recipe)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform duration-200 cursor-pointer relative"
            >
              <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-40 object-cover" />
              <div className="p-4">
                <h2 className="font-semibold text-lg text-stone-800">{recipe.name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                    {recipe.categories.map(cat => (
                        <span key={cat} className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{cat}</span>
                    ))}
                </div>
              </div>
               <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRecipe(recipe);
                }}
                className="absolute top-2 right-2 rounded-xl shadow-lg transition-transform active:scale-90 hover:scale-105"
                aria-label={`Supprimer la recette ${recipe.name}`}
              >
                <DeleteRecipeIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipeListScreen;