import React, { useState, useMemo, useRef } from 'react';
import { Recipe, Ingredient, GroceryListItem } from '../types';
import AddCategoryModal from './AddCategoryModal';
import ChangeImageModal from './ChangeImageModal';
import { DEFAULT_CATEGORIES } from '../constants';

type RecipeDetailScreenProps = {
  recipe: Recipe;
  onBack: () => void;
  onDeleteRequest: (id: string) => void;
  onUpdateRecipe: (recipe: Recipe) => void;
  groceryList: GroceryListItem[];
  onToggleGroceryItem: (ingredient: Ingredient) => void;
};

const getMetricDisplay = (ing: Ingredient): string | null => {
    // A very simple map for demo purposes.
    const conversions: { [key: string]: { [unit: string]: number } } = {
        'farine': { 'tasse': 120, 'tasses': 120 },
        'sucre': { 'tasse': 200, 'tasses': 200 },
        'sucre en poudre': { 'tasse': 200, 'tasses': 200 },
        'cassonade': { 'tasse': 220, 'tasses': 220 },
        'beurre': { 'tasse': 227, 'tasses': 227, 'c.à.s': 14.2 },
        'lait': { 'tasse': 240, 'tasses': 240 },
        'eau': { 'tasse': 236, 'tasses': 236 },
        'huile': { 'tasse': 218, 'tasses': 218, 'c.à.s': 13.6 },
    };
    const ingredientName = ing.name.toLowerCase();
    const unit = ing.unit?.toLowerCase();
    if (unit && ing.quantity) {
        for (const key in conversions) {
            if (ingredientName.includes(key) && conversions[key][unit]) {
                const grams = conversions[key][unit] * ing.quantity;
                return `(${Math.round(grams)}g)`;
            }
        }
    }
    return null;
}

const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({ recipe, onBack, onDeleteRequest, onUpdateRecipe, groceryList, onToggleGroceryItem }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableRecipe, setEditableRecipe] = useState<Recipe>(recipe);

    const [multiplier, setMultiplier] = useState(1);
    const [crossedIngredients, setCrossedIngredients] = useState<Set<string>>(new Set());
    const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    
    // Refs for drag and drop
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const getAdjustedQuantity = (quantity?: number) => {
        if (quantity === undefined) return '';
        const result = quantity * multiplier;
        // Handle fractions for better display
        if (result % 1 === 0.5) return `${Math.floor(result) || ''} ½`;
        if (result % 1 === 0.25) return `${Math.floor(result) || ''} ¼`;
        if (result % 1 === 0.75) return `${Math.floor(result) || ''} ¾`;
        if (result % 1 !== 0) return result.toFixed(2);
        return result;
    }

    const groceryListSet = useMemo(() => new Set(groceryList.map(item => item.name.toLowerCase())), [groceryList]);

    const isIngredientInGroceryList = (ingredient: Ingredient) => {
         return groceryList.some(item => item.name.toLowerCase().includes(ingredient.name.toLowerCase()));
    };

    const toggleIngredientCrossed = (id: string) => {
        setCrossedIngredients(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };
    
    const allIngredientsOnList = useMemo(() => {
        if (recipe.ingredients.length === 0) return false;
        return recipe.ingredients.every(ing => {
            const adjustedIngredient = { ...ing, quantity: ing.quantity ? ing.quantity * multiplier : undefined };
            const ingredientString = `${adjustedIngredient.quantity ? `${getAdjustedQuantity(adjustedIngredient.quantity)} ` : ''}${adjustedIngredient.unit || ''} ${adjustedIngredient.name}`.trim().toLowerCase();
            return groceryList.some(item => item.name.toLowerCase().includes(ing.name.toLowerCase()));
        });
    }, [recipe.ingredients, groceryList, multiplier]);

    const handleToggleAllToList = () => {
        const areAllOnList = recipe.ingredients.every(isIngredientInGroceryList);
        recipe.ingredients.forEach(ing => {
            const adjustedIngredient = { ...ing, quantity: ing.quantity ? ing.quantity * multiplier : undefined };
            const isOnList = isIngredientInGroceryList(adjustedIngredient);
            if ((areAllOnList && isOnList) || (!areAllOnList && !isOnList)) {
                 onToggleGroceryItem(adjustedIngredient);
            }
        });
    };
    
    const allIngredientsCrossed = useMemo(() => {
        if (recipe.ingredients.length === 0) return false;
        return crossedIngredients.size === recipe.ingredients.length;
    }, [recipe.ingredients.length, crossedIngredients.size]);

    const handleToggleCrossAllIngredients = () => {
        if (allIngredientsCrossed) {
            setCrossedIngredients(new Set());
        } else {
            const allIngredientIds = new Set(recipe.ingredients.map(ing => ing.id));
            setCrossedIngredients(allIngredientIds);
        }
    };

    const toggleStep = (index: number) => {
        setCheckedSteps(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) newSet.delete(index);
            else newSet.add(index);
            return newSet;
        });
    }
    
    const handleAddCategory = (category: string) => {
        if (!recipe.categories.map(c => c.toLowerCase()).includes(category.toLowerCase())) {
            const updatedRecipe = { ...recipe, categories: [...recipe.categories, category] };
            onUpdateRecipe(updatedRecipe);
        }
    };

    const handleRemoveCategory = (category: string) => {
        const updatedRecipe = { ...recipe, categories: recipe.categories.filter(c => c !== category) };
        onUpdateRecipe(updatedRecipe);
    };

    const handleShare = async () => {
        const ingredientsText = recipe.ingredients.map(ing => `• ${getAdjustedQuantity(ing.quantity)} ${ing.unit || ''} ${ing.name}`.trim()).join('\n');
        const instructionsText = recipe.instructions.map((step, index) => `${index + 1}. ${step}`).join('\n');
        const shareData = { title: recipe.title, text: `Découvrez cette recette: ${recipe.title}\n\nIngrédients:\n${ingredientsText}\n\nPréparation:\n${instructionsText}` };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (err) { console.error('Share failed:', err); }
        } else { alert("La fonction de partage n'est pas supportée sur ce navigateur."); }
    };
    
    // --- Edit Mode Handlers ---
    const handleToggleEdit = () => {
        if (isEditing) {
            onUpdateRecipe(editableRecipe);
        } else {
            setEditableRecipe(recipe);
        }
        setIsEditing(!isEditing);
    };
    
    const handleImageChange = (newImageUrl: string) => {
        setEditableRecipe(prev => ({ ...prev, imageUrl: newImageUrl }));
        setIsImageModalOpen(false);
    };

    const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
        const newIngredients = [...editableRecipe.ingredients];
        (newIngredients[index] as any)[field] = value;
        setEditableRecipe(prev => ({ ...prev, ingredients: newIngredients }));
    };

    const handleAddIngredient = () => {
        const newIngredient: Ingredient = { id: crypto.randomUUID(), name: '', quantity: undefined, unit: '' };
        setEditableRecipe(prev => ({ ...prev, ingredients: [...prev.ingredients, newIngredient] }));
    };

    const handleRemoveIngredient = (index: number) => {
        setEditableRecipe(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) }));
    };

    const handleInstructionChange = (index: number, value: string) => {
        const newInstructions = [...editableRecipe.instructions];
        newInstructions[index] = value;
        setEditableRecipe(prev => ({ ...prev, instructions: newInstructions }));
    };

    const handleAddInstruction = () => {
        setEditableRecipe(prev => ({ ...prev, instructions: [...prev.instructions, ''] }));
    };

    const handleRemoveInstruction = (index: number) => {
        setEditableRecipe(prev => ({ ...prev, instructions: prev.instructions.filter((_, i) => i !== index) }));
    };
    
    const handleDragSort = (list: any[], setList: (list: any[]) => void) => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const newList = [...list];
        const draggedItemContent = newList.splice(dragItem.current, 1)[0];
        newList.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setList(newList);
    };

  return (
    <>
    <div className="bg-[#F9F9F5] min-h-screen">
      <div className="relative h-80">
        <img src={isEditing ? editableRecipe.imageUrl : recipe.imageUrl} alt={isEditing ? editableRecipe.title : recipe.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

        <div className="absolute top-4 left-4">
            <button onClick={onBack} className="bg-black/30 rounded-full p-2 text-white hover:bg-black/50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
        </div>

        <div className="absolute top-4 right-4 flex gap-2">
            {isEditing && (
                <button onClick={() => setIsImageModalOpen(true)} className="bg-white rounded-full p-2.5 shadow-md" aria-label="Changer l'image">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </button>
            )}
            <button onClick={handleToggleEdit} className="bg-white rounded-full p-2.5 shadow-md">
                {isEditing ? 
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lime-600"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> :
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                }
            </button>
            {!isEditing &&
                <button onClick={() => onDeleteRequest(recipe.id)} className="bg-white rounded-full p-2.5 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            }
        </div>
        
        {isEditing ? (
            <input type="text" value={editableRecipe.title} onChange={(e) => setEditableRecipe(prev => ({ ...prev, title: e.target.value }))} className="absolute bottom-6 left-0 px-6 w-full bg-transparent text-4xl font-bold text-white tracking-tight border-none focus:outline-none focus:ring-0" />
        ) : (
            <h1 className="absolute bottom-6 px-6 text-4xl font-bold text-white tracking-tight">{recipe.title}</h1>
        )}
      </div>

      <div className="bg-white rounded-t-3xl -mt-6 relative p-6 z-10 pb-24">
        {!isEditing && (
            <>
                {/* Categories */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Catégories</h2>
                    <button onClick={handleShare}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg></button>
                </div>
                <div className="flex flex-wrap gap-3 items-center mb-8">
                    {recipe.categories.map(category => (
                        <div key={category} className="bg-lime-100 text-lime-800 text-lg font-semibold pl-5 pr-3 py-2.5 rounded-full flex items-center gap-2">
                            <span>{category}</span>
                            <button onClick={() => handleRemoveCategory(category)} className="text-lime-400 hover:text-lime-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                    <button onClick={() => setIsCategoryModalOpen(true)} className="bg-lime-100 text-lime-800 w-12 h-12 flex items-center justify-center rounded-full font-bold text-2xl hover:bg-lime-200 transition-colors">+</button>
                </div>
            </>
        )}
        
        {/* Ingredients */}
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Ingrédients</h2>
        {!isEditing && (
            <>
                <div className="flex justify-center items-center bg-gray-100 rounded-full p-1 mb-4">
                    <button onClick={() => setMultiplier(0.5)} className={`w-full px-4 py-2 rounded-full font-bold transition-all ${multiplier === 0.5 ? 'bg-white shadow' : 'text-gray-500'}`}>1/2X</button>
                    <button onClick={() => setMultiplier(1)} className={`w-full px-4 py-2 rounded-full font-bold transition-all ${multiplier === 1 ? 'bg-white shadow' : 'text-gray-500'}`}>1X</button>
                    <button onClick={() => setMultiplier(2)} className={`w-full px-4 py-2 rounded-full font-bold transition-all ${multiplier === 2 ? 'bg-white shadow' : 'text-gray-500'}`}>2X</button>
                </div>
                <div className="flex justify-between items-center mb-4 -mx-2">
                     <button onClick={handleToggleCrossAllIngredients} className={`transition-colors p-2 rounded-full ${allIngredientsCrossed ? 'text-lime-500 hover:text-lime-700' : 'text-gray-500 hover:text-gray-800'}`} aria-label="Tout cocher ou décocher les ingrédients">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.3333 1H7.66667C6.02985 1 4.66667 2.36318 4.66667 4V6.33333H6.33333V4C6.33333 3.26362 6.93029 2.66667 7.66667 2.66667H19.3333C20.0697 2.66667 20.6667 3.26362 20.6667 4V15.6667C20.6667 16.403 20.0697 17 19.3333 17H18V18.6667H19.3333C21.0001 18.6667 22.3333 17.3335 22.3333 15.6667V4C22.3333 2.36318 21.0001 1 19.3333 1Z"/>
                            <path fillRule="evenodd" clipRule="evenodd" d="M1.66667 7.33333C1.66667 5.66652 3.00015 4.33333 4.66667 4.33333H16C17.6668 4.33333 19 5.66652 19 7.33333V19C19 20.6668 17.6668 22 16 22H4.66667C3.00015 22 1.66667 20.6668 1.66667 19V7.33333ZM13.1602 11.0102C13.562 10.6083 14.218 10.6083 14.6198 11.0102L15.0102 11.4005C15.412 11.8024 15.412 12.4583 15.0102 12.8602L9.86016 18.0102C9.45831 18.412 8.80239 18.412 8.40054 18.0102L5.01016 14.6202C4.60831 14.2183 4.60831 13.5624 5.01016 13.1605L5.40054 12.7702C5.80239 12.3683 6.45831 12.3683 6.86016 12.7702L8.90054 14.8105L13.1602 11.0102Z"/>
                        </svg>
                    </button>
                     <button onClick={handleToggleAllToList} className={`transition-colors p-2 rounded-full ${allIngredientsOnList ? 'text-lime-500 hover:text-lime-700' : 'text-gray-500 hover:text-gray-800'}`} aria-label="Tout ajouter ou retirer de la liste d'épicerie">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.3333 1H7.66667C6.02985 1 4.66667 2.36318 4.66667 4V6.33333H6.33333V4C6.33333 3.26362 6.93029 2.66667 7.66667 2.66667H19.3333C20.0697 2.66667 20.6667 3.26362 20.6667 4V15.6667C20.6667 16.403 20.0697 17 19.3333 17H18V18.6667H19.3333C21.0001 18.6667 22.3333 17.3335 22.3333 15.6667V4C22.3333 2.36318 21.0001 1 19.3333 1Z"/>
                            <path fillRule="evenodd" clipRule="evenodd" d="M1.66667 7.33333C1.66667 5.66652 3.00015 4.33333 4.66667 4.33333H16C17.6668 4.33333 19 5.66652 19 7.33333V19C19 20.6668 17.6668 22 16 22H4.66667C3.00015 22 1.66667 20.6668 1.66667 19V7.33333ZM13.1602 11.0102C13.562 10.6083 14.218 10.6083 14.6198 11.0102L15.0102 11.4005C15.412 11.8024 15.412 12.4583 15.0102 12.8602L9.86016 18.0102C9.45831 18.412 8.80239 18.412 8.40054 18.0102L5.01016 14.6202C4.60831 14.2183 4.60831 13.5624 5.01016 13.1605L5.40054 12.7702C5.80239 12.3683 6.45831 12.3683 6.86016 12.7702L8.90054 14.8105L13.1602 11.0102Z"/>
                        </svg>
                    </button>
                </div>
            </>
        )}

        <ul className="space-y-4 mb-8">
           {isEditing ? editableRecipe.ingredients.map((ing, index) => (
                <li key={ing.id} draggable onDragStart={() => dragItem.current = index} onDragEnter={() => dragOverItem.current = index} onDragEnd={() => handleDragSort(editableRecipe.ingredients, (list) => setEditableRecipe(p => ({ ...p, ingredients: list })))} onDragOver={(e) => e.preventDefault()} className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                    <span className="cursor-grab text-gray-400">☰</span>
                    <input type="number" placeholder="Qt" value={ing.quantity || ''} onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-16 p-1 border rounded bg-white text-gray-800 placeholder-gray-400" />
                    <input type="text" placeholder="Unité" value={ing.unit || ''} onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)} className="w-20 p-1 border rounded bg-white text-gray-800 placeholder-gray-400" />
                    <input type="text" placeholder="Nom de l'ingrédient" value={ing.name} onChange={(e) => handleIngredientChange(index, 'name', e.target.value)} className="flex-grow p-1 border rounded bg-white text-gray-800 placeholder-gray-400" />
                    <button onClick={() => handleRemoveIngredient(index)} className="text-red-500 p-1">✕</button>
                </li>
           )) : recipe.ingredients.map(ing => {
               const ingredientForList = { ...ing, quantity: ing.quantity ? ing.quantity * multiplier : undefined };
               const isOnGroceryList = isIngredientInGroceryList(ingredientForList);
               return (
                 <li key={ing.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                        <button onClick={() => toggleIngredientCrossed(ing.id)} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mr-3 transition-colors ${crossedIngredients.has(ing.id) ? 'bg-gray-300 border-gray-300' : 'border-gray-300'}`}>
                            {crossedIngredients.has(ing.id) && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </button>
                        <span className={`text-xl font-bold text-gray-700 ${crossedIngredients.has(ing.id) ? 'line-through text-gray-400' : ''}`}>
                            {getAdjustedQuantity(ing.quantity)} {ing.unit} {ing.name} <span className="text-gray-400 font-normal">{getMetricDisplay({...ing, quantity: ing.quantity ? ing.quantity * multiplier : undefined})}</span>
                        </span>
                    </div>
                    <button onClick={() => onToggleGroceryItem(ingredientForList)}>
                        {isOnGroceryList
                            ? <div className="w-7 h-7 rounded-full bg-[#BDEE63] text-gray-800 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>
                            : <div className="w-7 h-7 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div>
                        }
                    </button>
                 </li>
               )
           })}
        </ul>
        {isEditing && <button onClick={handleAddIngredient} className="w-full text-center py-2 bg-lime-100 text-lime-800 rounded-lg font-semibold">+ Ajouter un ingrédient</button>}

        {/* Preparation */}
        <h2 className="text-3xl font-bold text-gray-800 my-6">Préparation</h2>
        <ol className="space-y-6">
           {isEditing ? editableRecipe.instructions.map((step, index) => (
               <li key={index} draggable onDragStart={() => dragItem.current = index} onDragEnter={() => dragOverItem.current = index} onDragEnd={() => handleDragSort(editableRecipe.instructions, (list) => setEditableRecipe(p => ({ ...p, instructions: list })))} onDragOver={(e) => e.preventDefault()} className="flex items-start gap-2 bg-gray-100 p-2 rounded-lg">
                   <span className="cursor-grab text-gray-400 pt-1">☰</span>
                   <textarea value={step} onChange={(e) => handleInstructionChange(index, e.target.value)} className="w-full p-1 border rounded-md bg-white text-gray-800 placeholder-gray-400" rows={3}></textarea>
                   <button onClick={() => handleRemoveInstruction(index)} className="text-red-500 p-1">✕</button>
               </li>
           )) : recipe.instructions.map((step, index) => (
             <li key={index} className="flex items-start gap-4">
                 <div className="flex items-center gap-3">
                    <span className="font-bold text-xl text-lime-500 leading-tight">{index + 1}.</span>
                    <button onClick={() => toggleStep(index)} className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${checkedSteps.has(index) ? 'bg-[#BDEE63] border-[#BDEE63]' : 'border-gray-300'}`}></button>
                </div>
                <p className={`text-xl text-gray-700 pt-px ${checkedSteps.has(index) ? 'line-through text-gray-400' : ''}`}>{step}</p>
            </li>
           ))}
        </ol>
        {isEditing && <button onClick={handleAddInstruction} className="w-full text-center py-2 bg-lime-100 text-lime-800 rounded-lg font-semibold mt-4">+ Ajouter une étape</button>}
      </div>
    </div>
    {!isEditing && <AddCategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onAddCategory={handleAddCategory} currentCategories={recipe.categories} suggestedCategories={DEFAULT_CATEGORIES}/>}
    {isEditing && <ChangeImageModal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} onImageSelected={handleImageChange} />}
    </>
  );
};

export default RecipeDetailScreen;