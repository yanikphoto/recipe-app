import React, { useState, useMemo, useEffect } from 'react';
import { Page, Recipe, GroceryItem } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import AddRecipeScreen from './components/AddRecipeScreen';
import RecipeListScreen from './components/RecipeListScreen';
import RecipeDetailScreen from './components/RecipeDetailScreen';
import BottomNav from './components/BottomNav';
import SearchModal from './components/SearchModal';
import GroceryListScreen from './components/GroceryListScreen';
import { MOCK_RECIPES } from './constants';
import { generateRecipeFromImage, generateRecipeFromUrl } from './services/geminiService';

// --- Confirmation Modal Component ---
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-stone-800 mb-2">{title}</h3>
        <p className="text-stone-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-stone-100 text-stone-800 font-semibold py-2 px-4 rounded-lg transition-all active:scale-95 hover:bg-stone-200"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg transition-all active:scale-95 hover:bg-red-600"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Welcome);
  
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    try {
      const savedRecipes = localStorage.getItem('nos-recettes-recipes');
      return savedRecipes ? JSON.parse(savedRecipes) : MOCK_RECIPES;
    } catch (error) {
      console.error("Échec du chargement des recettes depuis localStorage", error);
      return MOCK_RECIPES;
    }
  });

  const [groceryList, setGroceryList] = useState<GroceryItem[]>(() => {
    try {
      const savedList = localStorage.getItem('nos-recettes-grocery-list');
      return savedList ? JSON.parse(savedList) : [];
    } catch (error) {
      console.error("Échec du chargement de la liste d'épicerie depuis localStorage", error);
      return [];
    }
  });

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  
  useEffect(() => {
    try {
      localStorage.setItem('nos-recettes-recipes', JSON.stringify(recipes));
    } catch (error) {
      console.error("Échec de la sauvegarde des recettes sur localStorage", error);
    }
  }, [recipes]);

  useEffect(() => {
    try {
      localStorage.setItem('nos-recettes-grocery-list', JSON.stringify(groceryList));
    } catch (error) {
      console.error("Échec de la sauvegarde de la liste d'épicerie sur localStorage", error);
    }
  }, [groceryList]);

  const allUniqueCategories = useMemo(() => {
    const allCategories = recipes.flatMap(r => r.categories);
    // FIX: Explicitly type 'a' and 'b' as strings to resolve TypeScript error.
    return [...new Set(allCategories)].sort((a: string, b: string) => a.localeCompare(b));
  }, [recipes]);

  const navigateTo = (page: Page) => {
    // Clear category filter when navigating away from the list view
    if (page !== Page.RecipeList) {
      setActiveCategoryFilter(null);
    }
    setCurrentPage(page);
  };

  const viewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentPage(Page.RecipeDetail);
    setIsSearchModalOpen(false); // Close search modal when a recipe is viewed
  };
  
  const updateRecipeInList = (updatedRecipe: Recipe) => {
    setRecipes(prevRecipes => 
        prevRecipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r)
    );
    if (selectedRecipe && selectedRecipe.id === updatedRecipe.id) {
        setSelectedRecipe(updatedRecipe);
    }
  };

  const requestDeleteRecipe = (recipe: Recipe) => {
    setRecipeToDelete(recipe);
  };

  const handleConfirmDelete = () => {
    if (!recipeToDelete) return;

    setRecipes(prevRecipes => prevRecipes.filter(r => r.id !== recipeToDelete.id));
    if (currentPage === Page.RecipeDetail && selectedRecipe?.id === recipeToDelete.id) {
        navigateTo(Page.RecipeList);
        setSelectedRecipe(null);
    }
    setRecipeToDelete(null);
  };

  const fileToBase64 = (file: File): Promise<{base64: string, dataUrl: string}> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve({base64, dataUrl});
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleRecipeGeneration = async (file: File) => {
    setIsLoading(true);
    setCurrentPage(Page.AddRecipe);
    try {
      const { base64, dataUrl } = await fileToBase64(file);
      const newRecipe = await generateRecipeFromImage(base64, file.type, dataUrl);
      setRecipes(prev => [newRecipe, ...prev]);
      setSelectedRecipe(newRecipe);
      setCurrentPage(Page.RecipeDetail);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Une erreur inconnue est survenue.");
      setCurrentPage(Page.AddRecipe);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeGenerationFromUrl = async (url: string) => {
    setIsLoading(true);
    setCurrentPage(Page.AddRecipe);
    try {
      const newRecipe = await generateRecipeFromUrl(url);
      setRecipes(prev => [newRecipe, ...prev]);
      setSelectedRecipe(newRecipe);
      setCurrentPage(Page.RecipeDetail);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Une erreur inconnue est survenue.");
      setCurrentPage(Page.AddRecipe);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryFilter = (category: string) => {
    setActiveCategoryFilter(category);
    setIsSearchModalOpen(false);
    setCurrentPage(Page.RecipeList);
  };

  // --- Grocery List Handlers ---
  const addGroceryItem = (text: string) => {
    const newItem: GroceryItem = { id: `grocery-${Date.now()}`, text };
    setGroceryList(prev => [...prev, newItem]);
  };

  const deleteGroceryItem = (id: string) => {
    setGroceryList(prev => prev.filter(item => item.id !== id));
  };

  const reorderGroceryItems = (newList: GroceryItem[]) => {
    setGroceryList(newList);
  };
  // ---

  const displayedRecipes = activeCategoryFilter
    ? recipes.filter(r => r.categories.map(c => c.toLowerCase()).includes(activeCategoryFilter.toLowerCase()))
    : recipes;

  const renderContent = () => {
    switch (currentPage) {
      case Page.Welcome:
        return <WelcomeScreen onNavigate={navigateTo} onSearchClick={() => setIsSearchModalOpen(true)} />;
      case Page.AddRecipe:
        return <AddRecipeScreen 
                  onBack={() => navigateTo(Page.RecipeList)} 
                  onRecipeGenerated={handleRecipeGeneration} 
                  onRecipeGeneratedFromUrl={handleRecipeGenerationFromUrl}
                  isLoading={isLoading} />;
      case Page.RecipeList:
        return <RecipeListScreen 
                  recipes={displayedRecipes} 
                  onViewRecipe={viewRecipe} 
                  onNavigateToAdd={() => navigateTo(Page.AddRecipe)} 
                  onDeleteRecipe={requestDeleteRecipe}
                  activeCategory={activeCategoryFilter}
                  onClearFilter={() => setActiveCategoryFilter(null)}
                  allCategories={allUniqueCategories}
                  onCategorySelect={handleCategoryFilter}
               />;
      case Page.RecipeDetail:
        if (selectedRecipe) {
          return <RecipeDetailScreen 
                    recipe={selectedRecipe} 
                    onBack={() => navigateTo(Page.RecipeList)} 
                    onUpdateRecipe={updateRecipeInList} 
                    onDeleteRecipe={requestDeleteRecipe} 
                    groceryList={groceryList}
                    onAddGroceryItem={addGroceryItem}
                    onDeleteGroceryItem={deleteGroceryItem}
                 />;
        }
        // Fallback if no recipe is selected
        navigateTo(Page.RecipeList);
        return null;
      case Page.GroceryList:
        return <GroceryListScreen 
                  items={groceryList}
                  onAddItem={addGroceryItem}
                  onDeleteItem={deleteGroceryItem}
                  onReorder={reorderGroceryItems}
                  onBack={() => navigateTo(Page.Welcome)}
                />
      default:
        return <WelcomeScreen onNavigate={navigateTo} onSearchClick={() => setIsSearchModalOpen(true)} />;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FBF9F4] text-stone-800 relative">
        <main className="h-full">
            {renderContent()}
        </main>
        {isSearchModalOpen && (
            <SearchModal
              recipes={recipes}
              onClose={() => setIsSearchModalOpen(false)}
              onViewRecipe={viewRecipe}
              onCategoryFilter={handleCategoryFilter}
              uniqueCategories={allUniqueCategories}
            />
        )}
        <ConfirmationModal
          isOpen={!!recipeToDelete}
          onClose={() => setRecipeToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Confirmer la suppression"
          message={`Êtes-vous sûr de vouloir supprimer la recette "${recipeToDelete?.name}" ? Cette action est irréversible.`}
        />
        {currentPage !== Page.Welcome && <BottomNav currentPage={currentPage} onNavigate={navigateTo} onSearchClick={() => setIsSearchModalOpen(true)} />}
    </div>
  );
};

export default App;