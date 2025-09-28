import React, { useState, useMemo } from 'react';
import { Recipe } from '../types';

type SearchModalProps = {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onClose: () => void;
};

const SearchModal: React.FC<SearchModalProps> = ({ recipes, onSelectRecipe, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const usedCategories = useMemo(() => {
        const allCategories = recipes.flatMap(r => r.categories);
        return [...new Set(allCategories)].sort();
    }, [recipes]);

    const filteredRecipes = useMemo(() => {
        return recipes.filter(recipe => {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            const matchesCategory = selectedCategory ? recipe.categories.includes(selectedCategory) : true;
            const matchesSearchTerm = searchTerm 
                ? recipe.title.toLowerCase().includes(lowerCaseSearchTerm) || recipe.categories.some(c => c.toLowerCase().includes(lowerCaseSearchTerm))
                : true;
            
            return matchesCategory && matchesSearchTerm;
        });
    }, [recipes, searchTerm, selectedCategory]);

    const showResults = !!searchTerm || !!selectedCategory;

    const handleCategoryClick = (category: string) => {
        setSearchTerm('');
        setSelectedCategory(prev => (prev === category ? null : category));
    };
    
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        if (selectedCategory) {
            setSelectedCategory(null);
        }
    }

    return (
        <div 
            className="fixed inset-0 bg-gray-900/60 z-50 flex items-start justify-center pt-16 md:pt-24" 
            onClick={onClose} 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="search-modal-title"
        >
            <div 
                className="bg-white rounded-3xl w-[92%] max-w-lg p-5 shadow-2xl" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 id="search-modal-title" className="text-2xl font-bold text-gray-800">Chercher une recette</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fermer la recherche">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="relative mb-5">
                    <input
                        type="search"
                        placeholder="Nom de la recette..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full p-4 pl-12 text-lg text-gray-800 bg-white border-2 border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#BDEE63] focus:border-[#BDEE63] transition-colors"
                        autoFocus
                    />
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                
                <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 px-1">Catégories</h3>
                <div className="flex flex-wrap gap-2 mb-5">
                    {usedCategories.map(cat => (
                        <button 
                            key={cat} 
                            onClick={() => handleCategoryClick(cat)}
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${selectedCategory === cat ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                
                <div className="max-h-[50vh] overflow-y-auto -mr-2 pr-2">
                    {showResults ? (
                        filteredRecipes.length > 0 ? (
                            <ul className="space-y-3">
                                {filteredRecipes.map(recipe => (
                                    <li key={recipe.id} onClick={() => onSelectRecipe(recipe)} className="flex items-center bg-white p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                        <img src={recipe.imageUrl} alt={recipe.title} className="w-14 h-14 rounded-lg object-cover mr-4"/>
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{recipe.title}</h3>
                                            <p className="text-sm text-gray-500">{recipe.categories.join(', ')}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 pt-8 pb-4">Aucune recette trouvée.</p>
                        )
                    ) : (
                        <div className="text-center text-gray-400 pt-8 pb-4">
                            <p>Entrez un nom de recette ou sélectionnez une catégorie.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchModal;