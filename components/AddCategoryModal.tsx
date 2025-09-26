import React, { useState } from 'react';

type AddCategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (category: string) => void;
  currentCategories: string[];
  suggestedCategories: string[];
};

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onAddCategory,
  currentCategories,
  suggestedCategories,
}) => {
  const [newCategory, setNewCategory] = useState('');

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCategory = newCategory.trim();
    if (trimmedCategory) {
      onAddCategory(trimmedCategory);
      setNewCategory('');
    }
  };

  const handleAddSuggestedCategory = (category: string) => {
    onAddCategory(category);
  };
  
  const availableSuggestions = suggestedCategories.filter(
    (sugg) => !currentCategories.map(c => c.toLowerCase()).includes(sugg.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-3xl p-6 m-4 max-w-sm w-full shadow-lg transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Ajouter une catégorie</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-600 mb-3">Suggestions</h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {availableSuggestions.map((sugg) => (
              <button
                key={sugg}
                onClick={() => handleAddSuggestedCategory(sugg)}
                className="bg-[#D4F78F] text-gray-800 font-semibold px-4 py-2 rounded-xl hover:bg-[#BDEE63] transition-colors"
              >
                {sugg}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-600 mb-3">Ajouter une nouvelle</h3>
          <form onSubmit={handleAddCustomCategory} className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ex: Végétarien"
              className="w-full p-3 text-gray-700 bg-white border border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#BDEE63]"
            />
            <button
              type="submit"
              className="bg-gray-200 text-gray-800 font-bold px-5 rounded-2xl shadow-sm hover:bg-gray-300 transition-colors"
            >
              Ajouter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddCategoryModal;
