import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Recipe, Screen, GroceryListItem, Ingredient } from './types';
import { apiSync } from './services/apiSync';
import { imageStore } from './services/imageStore';
import WelcomeScreen from './components/WelcomeScreen';
import AddRecipeScreen from './components/AddRecipeScreen';
import RecipeListScreen from './components/RecipeListScreen';
import RecipeDetailScreen from './components/RecipeDetailScreen';
import GroceryListScreen from './components/GroceryListScreen';
import BottomNav from './components/BottomNav';
import SearchModal from './components/SearchModal';
import { DEFAULT_CATEGORIES } from './constants';
import TimerScreen from './components/TimerScreen';

const App: React.FC = () => {
    const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
    const [groceryList, setGroceryList] = useState<GroceryListItem[]>([]);
    const [deletedRecipeIds, setDeletedRecipeIds] = useState<string[]>([]);
    const [deletedGroceryIds, setDeletedGroceryIds] = useState<string[]>([]);

    // Sync state
    const [isOnline, setIsOnline] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [syncInProgress, setSyncInProgress] = useState(false);

    // Timer state
    const [timerEndTime, setTimerEndTime] = useState<number | null>(null);
    const [timerIsPaused, setTimerIsPaused] = useState(false);
    const [remainingOnPause, setRemainingOnPause] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);

    const timerIntervalRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const alarmGainNodeRef = useRef<GainNode | null>(null);
    const alarmIntervalRef = useRef<number | null>(null);
    
    const allCategories = useMemo(() => {
        const categoriesFromRecipes = recipes.flatMap(r => r.categories);
        return [...new Set([...DEFAULT_CATEGORIES, ...categoriesFromRecipes])];
    }, [recipes]);
    
    const sortedRecipes = useMemo(() => {
        return [...recipes].sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA;
        });
    }, [recipes]);

    const activeScreen = isSearchOpen ? 'search' : currentScreen;

    const getFullLocalData = () => {
        const localRecipesJSON = localStorage.getItem('family_recipes');
        const localGroceryJSON = localStorage.getItem('family_grocery');
        const localDeletedRecipesJSON = localStorage.getItem('family_deleted_recipes');
        const localDeletedGroceryJSON = localStorage.getItem('family_deleted_grocery');

        const localRecipes = localRecipesJSON ? JSON.parse(localRecipesJSON) : [];
        const localGrocery = localGroceryJSON ? JSON.parse(localGroceryJSON) : [];
        const localDeletedRecipes = localDeletedRecipesJSON ? JSON.parse(localDeletedRecipesJSON) : [];
        const localDeletedGrocery = localDeletedGroceryJSON ? JSON.parse(localDeletedGroceryJSON) : [];
        
        return {
            recipes: localRecipes.filter((r: Recipe) => r && r.id),
            groceryList: localGrocery.filter((i: GroceryListItem) => i && i.id),
            deletedRecipeIds: localDeletedRecipes,
            deletedGroceryIds: localDeletedGrocery
        };
    };
    
    const setFullLocalData = (data: { recipes: Recipe[], groceryList: GroceryListItem[], deletedRecipeIds: string[], deletedGroceryIds: string[] }) => {
        setRecipes(data.recipes);
        setGroceryList(data.groceryList);
        setDeletedRecipeIds(data.deletedRecipeIds);
        setDeletedGroceryIds(data.deletedGroceryIds);

        try {
            localStorage.setItem('family_recipes', JSON.stringify(data.recipes));
            localStorage.setItem('family_grocery', JSON.stringify(data.groceryList));
            localStorage.setItem('family_deleted_recipes', JSON.stringify(data.deletedRecipeIds));
            localStorage.setItem('family_deleted_grocery', JSON.stringify(data.deletedGroceryIds));
        } catch (error) {
            console.error("Could not write to localStorage:", error);
            // Optionally, inform the user that their data might not be saved.
        }
    };


    const syncData = async () => {
        if (syncInProgress) return;
        setSyncInProgress(true);
    
        try {
            const online = await apiSync.checkHealth();
            setIsOnline(online);
    
            const localData = getFullLocalData();
    
            if (online) {
                const finalData = await apiSync.saveData(localData, lastSyncTime);
    
                if (finalData) {
                    // Process incoming images
                    for (const recipe of finalData.recipes) {
                        if (recipe.imageBase64) {
                            try {
                                await imageStore.saveImage(recipe.imageUrl, recipe.imageBase64);
                            } catch (error) {
                                console.error(`Failed to save synced image for recipe ${recipe.id}`, error);
                            }
                            // Clean up the recipe object before storing it locally to save space
                            delete recipe.imageBase64;
                        }
                    }

                    setFullLocalData({
                        ...finalData,
                        deletedRecipeIds: finalData.deletedRecipeIds || [],
                        deletedGroceryIds: finalData.deletedGroceryIds || [],
                    });
                    setLastSyncTime(new Date());
                } else {
                    setIsOnline(false);
                    setFullLocalData(localData); // Fallback to local
                    console.warn("Sync POST failed, falling back to local data.");
                }
            } else {
                setFullLocalData(localData); // We are offline, use local data
            }
        } catch (error) {
            console.error("Error during sync:", error);
            setIsOnline(false);
            const localData = getFullLocalData();
            setFullLocalData(localData); // On any error, ensure app is usable with local data
        } finally {
            setSyncInProgress(false);
        }
    };

    // Load data on initial mount & handle auto-sync.
    useEffect(() => {
        let intervalId: number;
        const onlineHandler = () => syncData();

        const initApp = async () => {
            // 1. Load local data
            const localData = getFullLocalData();

            // 2. Perform one-time migration for existing base64 images
            let needsUpdate = false;
            const migratedRecipes = await Promise.all(
                localData.recipes.map(async (recipe) => {
                    if (recipe.imageUrl && recipe.imageUrl.startsWith('data:image')) {
                        try {
                            const newImageId = crypto.randomUUID();
                            const base64Data = recipe.imageUrl.split(',')[1];
                            if (base64Data) {
                                await imageStore.saveImage(newImageId, base64Data);
                                needsUpdate = true;
                                return { ...recipe, imageUrl: newImageId };
                            }
                        } catch (error) {
                            console.error(`Failed to migrate image for recipe: ${recipe.title}`, error);
                        }
                    }
                    return recipe;
                })
            );

            // 3. Update local storage and state
            const currentData = { ...localData, recipes: migratedRecipes };
            setFullLocalData(currentData);
            
            // 4. Start sync process
            await syncData(); // Initial sync
            intervalId = window.setInterval(syncData, 30000);
            window.addEventListener('online', onlineHandler);
        };

        initApp();

        return () => {
            if (intervalId) clearInterval(intervalId);
            window.removeEventListener('online', onlineHandler);
        };
    }, []);

    const playAlarm = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            alarmGainNodeRef.current = audioContextRef.current.createGain();
            alarmGainNodeRef.current.connect(audioContextRef.current.destination);
        }
        const audioContext = audioContextRef.current;
        const alarmGainNode = alarmGainNodeRef.current;
        if (!audioContext || !alarmGainNode) return;

        alarmGainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

        const sequence = () => {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            const now = audioContext.currentTime;

            const playNote = (freq: number, start: number, duration: number) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(alarmGainNode);
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(1, start + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                osc.start(start);
                osc.stop(start + duration);
            };
            
            playNote(523.25, now, 0.15); // C5
            playNote(783.99, now + 0.2, 0.3); // G5
        };

        sequence();
        alarmIntervalRef.current = window.setInterval(sequence, 1500);
    };

    const resetTimer = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (alarmIntervalRef.current) {
            clearInterval(alarmIntervalRef.current);
            alarmIntervalRef.current = null;
        }

        if (audioContextRef.current && alarmGainNodeRef.current) {
            const now = audioContextRef.current.currentTime;
            alarmGainNodeRef.current.gain.cancelScheduledValues(now);
            alarmGainNodeRef.current.gain.linearRampToValueAtTime(0, now + 0.1);
        }
    
        setTimerEndTime(null);
        setTimerIsPaused(false);
        setRemainingOnPause(null);
        setTimeLeft(0);
    };

    const stopAlarm = () => {
        setIsAlarmModalOpen(false);
        resetTimer();
    };
    
    useEffect(() => {
        const updateTimer = () => {
            if (timerEndTime && !timerIsPaused) {
                const remaining = Math.round((timerEndTime - Date.now()) / 1000);
                if (remaining > 0) {
                    setTimeLeft(remaining);
                } else {
                    setTimeLeft(0);
                    if (timerIntervalRef.current) {
                        clearInterval(timerIntervalRef.current);
                        timerIntervalRef.current = null;
                    }
                    playAlarm();
                    setIsAlarmModalOpen(true);
                }
            }
        };

        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }

        if (timerEndTime && !timerIsPaused) {
            updateTimer(); 
            timerIntervalRef.current = window.setInterval(updateTimer, 1000);
        }
        
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [timerEndTime, timerIsPaused]);

    const startTimer = (durationInSeconds: number) => {
        if (durationInSeconds <= 0) return;
        resetTimer();
        setTimerEndTime(Date.now() + durationInSeconds * 1000);
        setTimerIsPaused(false);
        setRemainingOnPause(null);
        setTimeLeft(durationInSeconds);
    };

    const pauseResumeTimer = () => {
        if (timerIsPaused) { 
            if (remainingOnPause) {
                setTimerEndTime(Date.now() + remainingOnPause);
            }
            setTimerIsPaused(false);
            setRemainingOnPause(null);
        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (timerEndTime) {
                setRemainingOnPause(timerEndTime - Date.now());
            }
            setTimerIsPaused(true);
        }
    };

    const setActiveScreen = (screen: Screen) => {
        if (screen === 'search') {
            setIsSearchOpen(true);
        } else {
            setIsSearchOpen(false);
            setCurrentScreen(screen);
        }
    };

    const closeSearchModal = () => {
        setIsSearchOpen(false);
    };

    const viewRecipe = (recipe: Recipe) => {
        setSelectedRecipe(recipe);
        setCurrentScreen('recipe-detail');
        setIsSearchOpen(false);
    };
    
    const addRecipe = (recipe: Recipe) => {
        const updatedRecipes = [recipe, ...recipes.filter(r => r.id !== recipe.id)];
        setRecipes(updatedRecipes);
        localStorage.setItem('family_recipes', JSON.stringify(updatedRecipes));
        setCurrentScreen('recipes');
        setIsSearchOpen(false);
    };

    const updateRecipe = async (updatedRecipe: Recipe) => {
        let finalRecipe = { ...updatedRecipe, updatedAt: new Date().toISOString() };
        const originalRecipe = recipes.find(r => r.id === updatedRecipe.id);
        
        // Check if the image has changed. New images will be base64.
        if (originalRecipe && updatedRecipe.imageUrl !== originalRecipe.imageUrl && updatedRecipe.imageUrl.startsWith('data:image')) {
            try {
                const newImageId = crypto.randomUUID();
                const base64Data = updatedRecipe.imageUrl.split(',')[1];
                if (!base64Data) throw new Error("Invalid base64 string");

                await imageStore.saveImage(newImageId, base64Data);

                if (originalRecipe.imageUrl && !originalRecipe.imageUrl.startsWith('data:') && !originalRecipe.imageUrl.startsWith('http')) {
                    await imageStore.deleteImage(originalRecipe.imageUrl);
                }
                
                finalRecipe.imageUrl = newImageId;
            } catch (error) {
                console.error("Failed to update image in IndexedDB", error);
                finalRecipe.imageUrl = originalRecipe.imageUrl;
            }
        }
    
        const updatedRecipes = recipes.map(r => r.id === finalRecipe.id ? finalRecipe : r);
        setRecipes(updatedRecipes);
        localStorage.setItem('family_recipes', JSON.stringify(updatedRecipes));
        if (selectedRecipe?.id === finalRecipe.id) {
            setSelectedRecipe(finalRecipe);
        }
    };

    const deleteRecipe = (id: string) => {
        const recipeToDelete = recipes.find(r => r.id === id);
        if (recipeToDelete && recipeToDelete.imageUrl && !recipeToDelete.imageUrl.startsWith('http') && !recipeToDelete.imageUrl.startsWith('data:')) {
            imageStore.deleteImage(recipeToDelete.imageUrl).catch(err => console.error("Failed to delete image from DB:", err));
        }

        const updatedRecipes = recipes.filter(r => r.id !== id);
        const updatedDeletedIds = [...new Set([...deletedRecipeIds, id])];
        
        setRecipes(updatedRecipes);
        setDeletedRecipeIds(updatedDeletedIds);
        
        localStorage.setItem('family_recipes', JSON.stringify(updatedRecipes));
        localStorage.setItem('family_deleted_recipes', JSON.stringify(updatedDeletedIds));
        
        if (selectedRecipe?.id === id) {
            setCurrentScreen('recipes');
            setSelectedRecipe(null);
        }
        setRecipeToDelete(null);
    };
    
    const getAdjustedQuantityString = (quantity?: number) => {
        if (quantity === undefined) return '';
        if (quantity % 1 === 0.5) return `${Math.floor(quantity) || ''} ½`;
        if (quantity % 1 === 0.25) return `${Math.floor(quantity) || ''} ¼`;
        if (quantity % 1 === 0.75) return `${Math.floor(quantity) || ''} ¾`;
        if (quantity % 1 !== 0) return quantity.toFixed(2);
        return String(quantity);
    };

    const toggleGroceryItemFromIngredient = (ingredient: Ingredient) => {
        const ingredientString = `${ingredient.quantity ? `${getAdjustedQuantityString(ingredient.quantity)} ` : ''}${ingredient.unit || ''} ${ingredient.name}`.trim();
        const existingItem = groceryList.find(item => item.name.toLowerCase() === ingredientString.toLowerCase());

        if (existingItem) {
            deleteGroceryItem(existingItem.id);
        } else {
            addCustomGroceryItem(ingredientString);
        }
    };
        
    const addCustomGroceryItem = (name: string) => {
        const newItem: GroceryListItem = { 
            id: crypto.randomUUID(), 
            name, 
            completed: false, 
            updatedAt: new Date().toISOString() 
        };
        const updatedItems = [newItem, ...groceryList];
        setGroceryList(updatedItems);
        localStorage.setItem('family_grocery', JSON.stringify(updatedItems));
    };

    const deleteGroceryItem = (id: string) => {
        const updatedItems = groceryList.filter(item => item.id !== id);
        const updatedDeletedIds = [...new Set([...deletedGroceryIds, id])];
        
        setGroceryList(updatedItems);
        setDeletedGroceryIds(updatedDeletedIds);

        localStorage.setItem('family_grocery', JSON.stringify(updatedItems));
        localStorage.setItem('family_deleted_grocery', JSON.stringify(updatedDeletedIds));
    };

    const reorderGroceryItems = (reorderedList: GroceryListItem[]) => {
        const now = new Date().toISOString();
        const updatedList = reorderedList.map(item => ({ ...item, updatedAt: now }));
        setGroceryList(updatedList);
        localStorage.setItem('family_grocery', JSON.stringify(updatedList));
    };

    const renderScreen = () => {
        switch (currentScreen) {
            case 'welcome':
                return <WelcomeScreen setActiveScreen={setActiveScreen} />;
            case 'recipes':
                return <RecipeListScreen recipes={sortedRecipes} onSelectRecipe={viewRecipe} onDeleteRequest={setRecipeToDelete} />;
            case 'add':
                return <AddRecipeScreen onAddRecipe={addRecipe} setActiveScreen={setActiveScreen} allCategories={allCategories} />;
            case 'list':
                return <GroceryListScreen 
                    items={groceryList} 
                    onAddItem={addCustomGroceryItem}
                    onDeleteItem={deleteGroceryItem}
                    onReorderItems={reorderGroceryItems}
                    onBack={() => setActiveScreen('recipes')}
                />;
            case 'timer':
                return <TimerScreen
                    onBack={() => setActiveScreen('recipes')}
                    timeLeft={timeLeft}
                    isPaused={timerIsPaused}
                    isActive={timerEndTime !== null}
                    onStart={startTimer}
                    onPauseResume={pauseResumeTimer}
                    onReset={() => {
                        setIsAlarmModalOpen(false);
                        resetTimer();
                    }}
                />;
            case 'recipe-detail':
                return selectedRecipe ? 
                    <RecipeDetailScreen 
                        recipe={selectedRecipe} 
                        onBack={() => setActiveScreen('recipes')}
                        onDeleteRequest={setRecipeToDelete}
                        onUpdateRecipe={updateRecipe}
                        groceryList={groceryList}
                        onToggleGroceryItem={toggleGroceryItemFromIngredient}
                    /> 
                    : <RecipeListScreen recipes={sortedRecipes} onSelectRecipe={viewRecipe} onDeleteRequest={setRecipeToDelete}/>;
            default:
                return <WelcomeScreen setActiveScreen={setActiveScreen} />;
        }
    };

    const isDetailScreen = currentScreen === 'recipe-detail';
    const positionClasses = isDetailScreen ? 'top-5 left-16' : 'top-5 right-5';

    const statusIndicator = (
        <div className={`fixed z-50 ${positionClasses}`}>
            {syncInProgress ? (
                <div className="w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-md" title="Synchronisation en cours...">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                </div>
            ) : isOnline ? (
                <div className="w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-md" title="En ligne">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                </div>
            ) : (
                <button onClick={syncData} className="w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-md" title="Hors ligne. Cliquez pour réessayer.">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                </button>
            )}
        </div>
    );

    return (
        <div className="max-w-lg mx-auto font-sans bg-[#F9F9F5] min-h-screen">
            {/* Sync Status Indicator */}
            {statusIndicator}

            <main>{renderScreen()}</main>
            <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
            
            {isAlarmModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-2xl p-6 m-4 max-w-sm w-full text-center shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Temps écoulé !</h2>
                        <button
                            onClick={stopAlarm}
                            className="px-6 py-4 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors w-full text-lg"
                        >
                            ARRÊTER
                        </button>
                    </div>
                </div>
            )}

            {isSearchOpen && (
                <SearchModal 
                    recipes={sortedRecipes}
                    onSelectRecipe={viewRecipe}
                    onClose={closeSearchModal}
                />
            )}

            {recipeToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300">
                    <div className="bg-white rounded-2xl p-6 m-4 max-w-sm w-full text-center shadow-lg transform transition-all duration-300 scale-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Confirmer la suppression</h2>
                        <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer cette recette ? Cette action est irréversible.</p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setRecipeToDelete(null)}
                                className="px-6 py-3 rounded-xl bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors w-full"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => deleteRecipe(recipeToDelete)}
                                className="px-6 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors w-full"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;