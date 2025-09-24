import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, Ingredient, Instruction, GroceryItem } from '../types';
import { BackIcon, DEFAULT_CATEGORIES, ShareIcon, DeleteRecipeIcon, CloseIcon, EditIcon, SaveIcon, DragHandleIcon, AddToListIcon, AddedToListIcon } from '../constants';

// --- Ingredient Portion Calculation Helpers ---

// Converts fraction strings (e.g., "1/2", "1 1/2") to a number.
function parseFraction(fraction: string): number {
  const trimmed = fraction.trim();
  if (trimmed.includes(' ')) {
    const [integer, frac] = trimmed.split(' ');
    const [num, den] = frac.split('/');
    return parseInt(integer, 10) + parseInt(num, 10) / parseInt(den, 10);
  } else if (trimmed.includes('/')) {
    const [num, den] = trimmed.split('/');
    return parseInt(num, 10) / parseInt(den, 10);
  }
  return parseFloat(trimmed);
}

// Converts a number back into a user-friendly fraction or decimal string.
function toFractionSimple(value: number): string {
    if (value === 0) return '0';
    // For larger numbers or results of complex fractions, round to avoid clutter.
    if (value >= 10 || (value > 1 && value !== Math.floor(value))) {
      return String(parseFloat(value.toFixed(2)).toString().replace(/\.00$/, ''));
    }
    
    const integerPart = Math.floor(value);
    const fractionalPart = value - integerPart;

    let fractionStr = '';
    if (fractionalPart > 0.01) {
        if (Math.abs(fractionalPart - 1/8) < 0.02) fractionStr = '1/8';
        else if (Math.abs(fractionalPart - 1/4) < 0.02) fractionStr = '1/4';
        else if (Math.abs(fractionalPart - 1/3) < 0.02) fractionStr = '1/3';
        else if (Math.abs(fractionalPart - 3/8) < 0.02) fractionStr = '3/8';
        else if (Math.abs(fractionalPart - 1/2) < 0.02) fractionStr = '1/2';
        else if (Math.abs(fractionalPart - 5/8) < 0.02) fractionStr = '5/8';
        else if (Math.abs(fractionalPart - 2/3) < 0.02) fractionStr = '2/3';
        else if (Math.abs(fractionalPart - 3/4) < 0.02) fractionStr = '3/4';
        else if (Math.abs(fractionalPart - 7/8) < 0.02) fractionStr = '7/8';
        else {
            return String(parseFloat(value.toFixed(2)).toString().replace(/\.00$/, ''));
        }
    }
    
    if (integerPart > 0) {
        return fractionStr ? `${integerPart} ${fractionStr}` : String(integerPart);
    } else {
        return fractionStr || '0';
    }
}

// Applies the multiplier to all numerical quantities in an ingredient list.
function adjustIngredientPortions(ingredients: Ingredient[], multiplier: number): Ingredient[] {
  if (multiplier === 1) {
    return ingredients;
  }
  
  const numberRegex = /(\d+\s+\d+\/\d+)|(\d+\/\d+)|(\d*\.\d+)|(\d+)/g;

  return ingredients.map(ingredient => {
    const newText = ingredient.text.replace(numberRegex, (match) => {
      const originalValue = parseFraction(match);
      if (isNaN(originalValue)) return match;

      const newValue = originalValue * multiplier;
      return toFractionSimple(newValue);
    });

    return { ...ingredient, text: newText };
  });
}


interface RecipeDetailScreenProps {
  recipe: Recipe;
  onBack: () => void;
  onUpdateRecipe: (updatedRecipe: Recipe) => void;
  onDeleteRecipe: (recipe: Recipe) => void;
  groceryList: GroceryItem[];
  onAddGroceryItem: (text: string) => void;
  onDeleteGroceryItem: (id: string) => void;
}

const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({ recipe, onBack, onUpdateRecipe, onDeleteRecipe, groceryList, onAddGroceryItem, onDeleteGroceryItem }) => {
  const [localRecipe, setLocalRecipe] = useState<Recipe>(recipe);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState<Recipe>(recipe);
  const [draggedInfo, setDraggedInfo] = useState<{ listType: 'ingredients' | 'instructions'; index: number } | null>(null);
  const [portionMultiplier, setPortionMultiplier] = useState(1);

  useEffect(() => {
    setLocalRecipe(recipe);
    setEditedRecipe(recipe); // Keep edit state in sync if recipe prop changes
    setPortionMultiplier(1); // Reset portion on new recipe view
  }, [recipe]);
  
  const displayedIngredients = useMemo(() => {
    return adjustIngredientPortions(localRecipe.ingredients, portionMultiplier);
  }, [localRecipe.ingredients, portionMultiplier]);
  
  const groceryItemMap = useMemo(() => {
    return new Map(groceryList.map(item => [item.text.trim().toLowerCase(), item]));
  }, [groceryList]);

  const handleStartEditing = () => {
    setEditedRecipe(JSON.parse(JSON.stringify(localRecipe))); // Deep copy for editing
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setEditedRecipe(localRecipe); // Revert changes
    setIsEditing(false);
  };

  const handleSaveChanges = () => {
    onUpdateRecipe(editedRecipe);
    setLocalRecipe(editedRecipe);
    setIsEditing(false);
  };

  const handleNameChange = (newName: string) => {
    setEditedRecipe(prev => ({ ...prev, name: newName }));
  };

  const handleListItemChange = (list: 'ingredients' | 'instructions', index: number, newText: string) => {
    const newList = [...editedRecipe[list]];
    const item = { ...(newList[index] as Ingredient | Instruction) };
    item.text = newText;
    newList[index] = item;

    if (list === 'ingredients') {
      setEditedRecipe(prev => ({ ...prev, ingredients: newList as Ingredient[] }));
    } else {
      setEditedRecipe(prev => ({ ...prev, instructions: newList as Instruction[] }));
    }
  };

  const handleIngredientToggle = (index: number) => {
    const newIngredients = [...localRecipe.ingredients];
    newIngredients[index].checked = !newIngredients[index].checked;
    const updatedRecipe = { ...localRecipe, ingredients: newIngredients };
    setLocalRecipe(updatedRecipe);
    onUpdateRecipe(updatedRecipe);
  };

  const handleInstructionToggle = (index: number) => {
    const newInstructions = [...localRecipe.instructions];
    newInstructions[index].checked = !newInstructions[index].checked;
    const updatedRecipe = { ...localRecipe, instructions: newInstructions };
    setLocalRecipe(updatedRecipe);
    onUpdateRecipe(updatedRecipe);
  };

  const clearAllChecks = () => {
    const clearedIngredients = localRecipe.ingredients.map(ing => ({ ...ing, checked: false }));
    const clearedInstructions = localRecipe.instructions.map(ins => ({ ...ins, checked: false }));
    const updatedRecipe = { ...localRecipe, ingredients: clearedIngredients, instructions: clearedInstructions };
    setLocalRecipe(updatedRecipe);
    onUpdateRecipe(updatedRecipe);
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    const newCategories = localRecipe.categories.filter(cat => cat !== categoryToDelete);
    const updatedRecipe = { ...localRecipe, categories: newCategories };
    setLocalRecipe(updatedRecipe);
    onUpdateRecipe(updatedRecipe);
  };

  const handleAddCategory = (categoryToAdd: string) => {
    const trimmedCategory = categoryToAdd.trim();
    if (trimmedCategory && !localRecipe.categories.some(cat => cat.toLowerCase() === trimmedCategory.toLowerCase())) {
        const newCategories = [...localRecipe.categories, trimmedCategory];
        const updatedRecipe = { ...localRecipe, categories: newCategories };
        setLocalRecipe(updatedRecipe);
        onUpdateRecipe(updatedRecipe);
    }
    setNewCategoryInput('');
    setIsCategoryModalOpen(false);
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddCategory(newCategoryInput);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const ingredientsText = localRecipe.ingredients.map(ing => `• ${ing.text}`).join('\n');
        const instructionsText = localRecipe.instructions.map((ins, index) => `${index + 1}. ${ins.text}`).join('\n\n');
        
        const shareText = `*${localRecipe.name}*\n\n*Ingrédients :*\n${ingredientsText}\n\n*Préparation :*\n${instructionsText}`;

        await navigator.share({
          title: `Recette : ${localRecipe.name}`,
          text: shareText,
        });
      } catch (error) {
        // User might cancel the share action, which is normal and shouldn't be logged as an error.
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.log('Share action was cancelled by the user.');
        } else {
            console.error('Erreur lors du partage:', error);
        }
      }
    } else {
      alert("La fonction de partage n'est pas supportée sur cet appareil.");
    }
  };

  // --- Drag and Drop Handlers ---
  const handleReorder = (listType: 'ingredients' | 'instructions', dragIndex: number, dropIndex: number) => {
      setEditedRecipe(prev => {
          if (dragIndex === dropIndex) return prev;
          
          const list = [...prev[listType]];
          const [draggedItem] = list.splice(dragIndex, 1);
          list.splice(dropIndex, 0, draggedItem);
          
          if (listType === 'ingredients') {
              return { ...prev, ingredients: list as Ingredient[] };
          } else {
              return { ...prev, instructions: list as Instruction[] };
          }
      });
  };

  const handleDragStart = (listType: 'ingredients' | 'instructions', index: number) => {
      setDraggedInfo({ listType, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleDrop = (listType: 'ingredients' | 'instructions', dropIndex: number) => {
      if (draggedInfo && draggedInfo.listType === listType) {
          handleReorder(listType, draggedInfo.index, dropIndex);
      }
      setDraggedInfo(null);
  };

  const handleDragEnd = () => {
      setDraggedInfo(null);
  };

  const availableDefaultCategories = DEFAULT_CATEGORIES.filter(
    defaultCat => !localRecipe.categories.some(recipeCat => recipeCat.toLowerCase() === defaultCat.toLowerCase())
  );
  
  const portionButtons = [
    { label: '1/2X', multiplier: 0.5 },
    { label: '1X', multiplier: 1 },
    { label: '2X', multiplier: 2 },
  ];

  return (
    <div className="bg-[#FBF9F4] min-h-full pb-24">
      <header className="relative h-72">
        <img src={localRecipe.imageUrl} alt={localRecipe.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center text-white">
          <button onClick={isEditing ? handleCancelEdit : onBack} className="bg-black/30 p-2 rounded-full backdrop-blur-sm">
            <BackIcon />
          </button>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button onClick={handleSaveChanges} className="rounded-xl shadow-lg transition-all active:scale-90 hover:scale-105" aria-label="Sauvegarder les modifications">
                <SaveIcon />
              </button>
            ) : (
              <button onClick={handleStartEditing} className="rounded-xl shadow-lg transition-all active:scale-90 hover:scale-105" aria-label="Modifier la recette">
                <EditIcon />
              </button>
            )}
           <button
             onClick={() => onDeleteRecipe(localRecipe)}
            className={`rounded-xl shadow-lg transition-all active:scale-90 hover:scale-105 ${isEditing ? 'opacity-50 pointer-events-none' : ''}`}
            aria-label="Supprimer la recette"
            disabled={isEditing}
            >
            <DeleteRecipeIcon />
          </button>
          </div>
        </div>
        {isEditing ? (
          <input
            type="text"
            value={editedRecipe.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="absolute bottom-0 left-0 w-full bg-transparent px-6 pb-6 pt-16 text-4xl font-bold text-white leading-tight border-none focus:outline-none focus:ring-2 focus:ring-white/50"
            autoFocus
          />
        ) : (
          <h1 className="absolute bottom-0 left-0 p-6 text-4xl font-bold text-white leading-tight">{localRecipe.name}</h1>
        )}
      </header>

      <main className="p-6 bg-white rounded-t-3xl -mt-6 relative">
        <div className={`mb-6 ${isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-stone-800">Catégories</h2>
            <button
              onClick={handleShare}
              className="p-2 rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors"
              aria-label="Partager la recette"
            >
              <ShareIcon />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {localRecipe.categories.map((cat) => (
              <span key={cat} className="bg-stone-100 text-stone-600 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium inline-flex items-center">
                {cat}
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="ml-2 w-4 h-4 rounded-full bg-stone-300 hover:bg-stone-400 flex items-center justify-center text-stone-600 transition-colors"
                  aria-label={`Supprimer la catégorie ${cat}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
             <button onClick={() => setIsCategoryModalOpen(true)} className="w-8 h-8 bg-lime-200/60 text-lime-800 rounded-full flex items-center justify-center font-bold text-xl hover:bg-lime-200 transition-colors">+</button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-stone-800">Ingrédients</h2>
            <div className="flex items-center gap-4">
              {!isEditing && <button onClick={clearAllChecks} className="text-sm text-stone-500 hover:text-stone-800 font-medium">Tout effacer</button>}
              {!isEditing && <span className="text-sm font-semibold text-stone-500">+ Liste</span>}
            </div>
          </div>
          
          {!isEditing && (
            <div className="mb-4">
              <div className="inline-flex items-center bg-stone-100 rounded-full border border-stone-200 p-1 space-x-1">
                {portionButtons.map((button) => {
                    const isSelected = portionMultiplier === button.multiplier;
                    return (
                        <button
                            key={button.multiplier}
                            onClick={() => setPortionMultiplier(button.multiplier)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1 ${isSelected ? 'bg-white shadow text-stone-900' : 'text-stone-500'}`}
                        >
                            {isSelected && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.35 2.35 4.493-6.74a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" />
                                </svg>
                            )}
                            {button.label}
                        </button>
                    )
                })}
              </div>
            </div>
          )}

          <ul className="space-y-3">
            {(isEditing ? editedRecipe.ingredients : displayedIngredients).map((ing, index) => {
              const existingGroceryItem = groceryItemMap.get(ing.text.trim().toLowerCase());
              return (
              <li 
                key={index} 
                className={`flex items-center transition-shadow ${draggedInfo?.listType === 'ingredients' && draggedInfo?.index === index ? 'opacity-40' : ''}`}
                draggable={isEditing}
                onDragStart={isEditing ? () => handleDragStart('ingredients', index) : undefined}
                onDragOver={isEditing ? handleDragOver : undefined}
                onDrop={isEditing ? () => handleDrop('ingredients', index) : undefined}
                onDragEnd={isEditing ? handleDragEnd : undefined}
              >
                 {isEditing ? (
                  <div className="flex items-center w-full gap-3 p-1 rounded-lg hover:bg-stone-50">
                    <input
                      type="text"
                      value={ing.text}
                      onChange={(e) => handleListItemChange('ingredients', index, e.target.value)}
                      className="w-full bg-stone-100 px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#BDEE63] focus:border-[#BDEE63] transition"
                    />
                    <div className="flex-shrink-0">
                      <DragHandleIcon />
                    </div>
                  </div>
                 ) : (
                  <>
                    <div
                      className="flex items-center flex-1 cursor-pointer group"
                      onClick={() => handleIngredientToggle(index)}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 ${ing.checked ? 'bg-[#BDEE63] border-[#BDEE63]' : 'border-stone-300'} flex items-center justify-center mr-3 transition-colors flex-shrink-0`}>
                        {ing.checked && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-stone-900"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.35 2.35 4.493-6.74a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" /></svg>}
                      </div>
                      <span className={`flex-1 ${ing.checked ? 'line-through text-stone-400' : 'text-stone-700'}`}>{ing.text}</span>
                    </div>
                    <div className="ml-3 flex-shrink-0 w-8 h-8 flex items-center justify-center">
                       <button
                          onClick={() => {
                            if (existingGroceryItem) {
                              onDeleteGroceryItem(existingGroceryItem.id);
                            } else {
                              onAddGroceryItem(ing.text);
                            }
                          }}
                          className="p-1 rounded-full group"
                          aria-label={existingGroceryItem ? `Retirer ${ing.text} de la liste d'épicerie` : `Ajouter ${ing.text} à la liste d'épicerie`}
                        >
                          {existingGroceryItem ? <AddedToListIcon /> : <AddToListIcon />}
                        </button>
                    </div>
                  </>
                 )}
              </li>
            )})}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-3">Préparation</h2>
          <ol className="space-y-4">
            {(isEditing ? editedRecipe.instructions : localRecipe.instructions).map((ins, index) => (
               <li 
                key={index} 
                className={`flex items-start transition-shadow ${draggedInfo?.listType === 'instructions' && draggedInfo?.index === index ? 'opacity-40' : ''}`}
                onClick={() => !isEditing && handleInstructionToggle(index)}
                draggable={isEditing}
                onDragStart={isEditing ? () => handleDragStart('instructions', index) : undefined}
                onDragOver={isEditing ? handleDragOver : undefined}
                onDrop={isEditing ? () => handleDrop('instructions', index) : undefined}
                onDragEnd={isEditing ? handleDragEnd : undefined}
               >
                 {isEditing ? (
                   <div className="flex items-start w-full gap-3 p-1 rounded-lg hover:bg-stone-50">
                      <span className="font-bold text-lg text-stone-400 mt-1">{index + 1}.</span>
                      <textarea
                        value={ins.text}
                        onChange={(e) => handleListItemChange('instructions', index, e.target.value)}
                        className="w-full bg-stone-100 px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#BDEE63] focus:border-[#BDEE63] transition min-h-[60px]"
                        rows={3}
                      />
                      <div className="flex-shrink-0 mt-1">
                          <DragHandleIcon />
                      </div>
                   </div>
                 ) : (
                   <div className="flex items-start cursor-pointer w-full">
                    <div className="flex-shrink-0 flex items-center">
                        <div className={`w-5 h-5 rounded-full border-2 ${ins.checked ? 'bg-[#BDEE63] border-[#BDEE63]' : 'border-stone-300'} flex items-center justify-center mr-3 mt-1 transition-colors`}>
                            {ins.checked && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-stone-900"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.35 2.35 4.493-6.74a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" /></svg>}
                        </div>
                        <span className={`font-bold text-lg mr-3 ${ins.checked ? 'text-stone-400' : 'text-[#BDEE63]'}`}>{index + 1}.</span>
                    </div>
                    <p className={`flex-1 ${ins.checked ? 'line-through text-stone-400' : 'text-stone-700'}`}>{ins.text}</p>
                   </div>
                 )}
              </li>
            ))}
          </ol>
        </div>
      </main>

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-stone-800">Ajouter une catégorie</h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 rounded-full hover:bg-stone-100">
                    <CloseIcon />
                </button>
            </div>

            {availableDefaultCategories.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-sm font-medium text-stone-500 mb-2">Suggestions</h4>
                    <div className="flex flex-wrap gap-2">
                        {availableDefaultCategories.map(cat => (
                            <button key={cat} onClick={() => handleAddCategory(cat)} className="bg-lime-100 text-lime-800 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-lime-200 transition-colors">
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div>
                <h4 className="text-sm font-medium text-stone-500 mb-2">Ajouter une nouvelle</h4>
                 <form onSubmit={handleFormSubmit}>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newCategoryInput}
                            onChange={(e) => setNewCategoryInput(e.target.value)}
                            placeholder="Ex: Végétarien"
                            className="flex-grow bg-stone-100 px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#BDEE63] focus:border-[#BDEE63] transition"
                            autoFocus
                        />
                        <button type="submit" className="bg-[#BDEE63] text-stone-900 font-semibold py-2 px-4 rounded-lg transition-transform active:scale-95 shadow-sm disabled:bg-stone-200" disabled={!newCategoryInput.trim()}>
                            Ajouter
                        </button>
                    </div>
                 </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDetailScreen;