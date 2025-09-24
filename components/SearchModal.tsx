import React, { useState, useMemo } from 'react';
import { Recipe } from '../types';
import { InputSearchIcon, CloseIcon } from '../constants';

interface SearchModalProps {
  recipes: Recipe[];
  onClose: () => void;
  onViewRecipe: (recipe: Recipe) => void;
  onCategoryFilter: (category: string) => void;
  uniqueCategories: string[];
}

const SearchModal: React.FC<SearchModalProps> = ({ recipes, onClose, onViewRecipe, onCategoryFilter, uniqueCategories }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecipes = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return recipes.filter(recipe => 
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, recipes]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center p-4 pt-20" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-md h-fit shadow-xl flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-800">Chercher une recette</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-stone-100">
                <CloseIcon />
            </button>
        </div>

        <div className="p-4 relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <InputSearchIcon />
            </div>
            <input
              type="text"
              placeholder="Nom de la recette..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-100 border border-stone-200 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-[#BDEE63] focus:border-[#BDEE63] transition"
              autoFocus
            />
          </div>
          {filteredRecipes.length > 0 && (
            <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              <ul>
                {filteredRecipes.map(recipe => (
                  <li key={recipe.id}>
                    <button 
                      onClick={() => onViewRecipe(recipe)}
                      className="w-full text-left px-4 py-2 hover:bg-stone-100 transition-colors"
                    >
                      {recipe.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="p-4 pt-0">
          <h3 className="text-sm font-medium text-stone-500 mb-3">CATÉGORIES</h3>
          <div className="flex flex-wrap gap-2">
            {uniqueCategories.map(category => (
              <button 
                key={category}
                onClick={() => onCategoryFilter(category)}
                className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-stone-200 transition-colors"
              >
                {category}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SearchModal;