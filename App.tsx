import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Recipe, Screen, GroceryListItem, Ingredient } from './types';
import { apiSync } from './services/apiSync';
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

    const activeScreen = isSearchOpen ? 'search' : currentScreen;

    // Load data on initial mount
    useEffect(() => {
        loadData();
    }, []);

    // Auto-sync every 30 seconds if online and not already syncing
    useEffect(() => {
        const interval = setInterval(() => {
            if (isOnline && !syncInProgress) {
                loadData();
            }
        }, 30000);
        
        return () => clearInterval(interval);
    }, [isOnline, syncInProgress]);

    // Check online status periodically
    useEffect(() => {
        const checkOnline = async () => {
            const online = await apiSync.checkHealth();
            setIsOnline(online);
        };
        
        checkOnline();
        const interval = setInterval(checkOnline, 60000); // Check every minute
        
        return () => clearInterval(interval);
    }, []);

    // Main function to sync data from API. It now performs a merge.
    const loadData = async () => {
        if (syncInProgress) return;
        setSyncInProgress(true);
        try {
            // This is now a two-way sync. It fetches server data, merges it with
            // local state (preserving offline changes), and saves it back.
            const serverData = await apiSync.getData();
            
            // Merge server data with current client state. Client state wins conflicts.
            const recipeMap = new Map();
            (serverData.recipes || []).forEach(r => recipeMap.set(r.id, r));
            recipes.forEach(r => recipeMap.set(r.id, r));

            const groceryMap = new Map();
            (serverData.groceryList || []).forEach(i => groceryMap.set(i.id, i));
            groceryList.forEach(i => groceryMap.set(i.id, i));
            
            const recipesToSave = Array.from(recipeMap.values());
            const groceryToSave = Array.from(groceryMap.values());
            
            // Post the merged data back to the server to consolidate the state
            const finalData = await apiSync.saveData({ recipes: recipesToSave, groceryList: groceryToSave });

            if (finalData) {
                // Update client with the final authoritative state from the server
                setRecipes(finalData.recipes || []);
                setGroceryList(finalData.groceryList || []);
                setIsOnline(true);
                setLastSyncTime(new Date());
                
                localStorage.setItem('family_recipes', JSON.stringify(finalData.recipes || []));
                localStorage.setItem('family_grocery', JSON.stringify(finalData.groceryList || []));
            } else {
                throw new Error("Failed to save merged data during sync.");
            }
            
        } catch (error) {
            console.error('Failed to sync from API, loading from localStorage:', error);
            setIsOnline(false);
            
            const localRecipes = localStorage.getItem('family_recipes');
            const localGrocery = localStorage.getItem('family_grocery');
            
            if (localRecipes) setRecipes(JSON.parse(localRecipes));
            if (localGrocery) setGroceryList(JSON.parse(localGrocery));
        } finally {
            setSyncInProgress(false);
        }
    };

    // Central function to save data, with robust merging to prevent data loss.
    const saveData = async (updatedRecipes: Recipe[], updatedGroceryList: GroceryListItem[]) => {
        // 1. Optimistic UI update for a snappy experience
        setRecipes(updatedRecipes);
        setGroceryList(updatedGroceryList);
        localStorage.setItem('family_recipes', JSON.stringify(updatedRecipes));
        localStorage.setItem('family_grocery', JSON.stringify(updatedGroceryList));

        if (!isOnline) {
            console.warn("Offline. Changes saved locally and will sync later.");
            return;
        }
        
        setSyncInProgress(true);
        try {
            // 2. Fetch latest server state before saving to prevent overwriting data.
            const serverData = await apiSync.getData();

            // 3. Merge server state with our intended optimistic updates.
            const recipeMap = new Map();
            (serverData.recipes || []).forEach(r => recipeMap.set(r.id, r));
            updatedRecipes.forEach(r => recipeMap.set(r.id, r)); // Our changes take precedence

            const groceryMap = new Map();
            (serverData.groceryList || []).forEach(i => groceryMap.set(i.id, i));
            updatedGroceryList.forEach(i => groceryMap.set(i.id, i)); // Our changes take precedence

            const dataToSave = {
                recipes: Array.from(recipeMap.values()),
                groceryList: Array.from(groceryMap.values()),
            };
            
            // 4. Call API with the fully merged data.
            const mergedData = await apiSync.saveData(dataToSave);
            
            if (mergedData) {
                // 5. Update state with the authoritative data from the server's final merge.
                const finalRecipes = mergedData.recipes || [];
                const finalGroceryList = mergedData.groceryList || [];
                setRecipes(finalRecipes);
                setGroceryList(finalGroceryList);
                localStorage.setItem('family_recipes', JSON.stringify(finalRecipes));
                localStorage.setItem('family_grocery', JSON.stringify(finalGroceryList));
                setLastSyncTime(new Date());
            } else {
                 console.error('Sync failed. Local data is preserved.');
            }
        } catch (error) {
            console.error('Failed to save to API:', error);
        } finally {
            setSyncInProgress(false);
        }
    };

    // Manual sync for the UI button
    const manualSync = () => {
        loadData();
    };

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
    
    const addRecipe = async (recipe: Recipe) => {
        const updatedRecipes = [recipe, ...recipes.filter(r => r.id !== recipe.id)];
        
        // This function handles the optimistic UI update, local storage, API sync,
        // and updating state with the merged result from the server.
        await saveData(updatedRecipes, groceryList);

        // Navigate after the save operation is complete.
        setCurrentScreen('recipes');
        setIsSearchOpen(false);
    };

    const updateRecipe = async (updatedRecipe: Recipe) => {
        const updatedRecipes = recipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r);
        if (selectedRecipe?.id === updatedRecipe.id) {
            setSelectedRecipe(updatedRecipe);
        }
        await saveData(updatedRecipes, groceryList);
    };

    const deleteRecipe = async (id: string) => {
        const updatedRecipes = recipes.filter(r => r.id !== id);
        if (selectedRecipe?.id === id) {
            setCurrentScreen('recipes');
            setSelectedRecipe(null);
        }
        setRecipeToDelete(null); // Close confirmation modal
        await saveData(updatedRecipes, groceryList);
    };
    
    // Helper to format quantity for grocery list items, consistent with detail view
    const getAdjustedQuantityString = (quantity?: number) => {
        if (quantity === undefined) return '';
        if (quantity % 1 === 0.5) return `${Math.floor(quantity) || ''} ½`;
        if (quantity % 1 === 0.25) return `${Math.floor(quantity) || ''} ¼`;
        if (quantity % 1 === 0.75) return `${Math.floor(quantity) || ''} ¾`;
        if (quantity % 1 !== 0) return quantity.toFixed(2);
        return String(quantity);
    };

    const toggleGroceryItemFromIngredient = async (ingredient: Ingredient) => {
        const ingredientString = `${ingredient.quantity ? `${getAdjustedQuantityString(ingredient.quantity)} ` : ''}${ingredient.unit || ''} ${ingredient.name}`.trim();
        const existingItem = groceryList.find(item => item.name.toLowerCase() === ingredientString.toLowerCase());

        let updatedList: GroceryListItem[];
        if (existingItem) {
            updatedList = groceryList.filter(item => item.id !== existingItem.id);
        } else {
            const newItem: GroceryListItem = { id: crypto.randomUUID(), name: ingredientString, completed: false };
            updatedList = [newItem, ...groceryList];
        }
        await saveData(recipes, updatedList);
    };
        
    const addCustomGroceryItem = async (name: string) => {
        const newItem: GroceryListItem = { id: crypto.randomUUID(), name, completed: false };
        const updatedItems = [newItem, ...groceryList];
        await saveData(recipes, updatedItems);
    };

    const deleteGroceryItem = async (id: string) => {
        const updatedItems = groceryList.filter(item => item.id !== id);
        await saveData(recipes, updatedItems);
    };

    const reorderGroceryItems = async (reorderedList: GroceryListItem[]) => {
        await saveData(recipes, reorderedList);
    };

    const renderScreen = () => {
        switch (currentScreen) {
            case 'welcome':
                return <WelcomeScreen setActiveScreen={setActiveScreen} />;
            case 'recipes':
                return <RecipeListScreen recipes={recipes} onSelectRecipe={viewRecipe} onDeleteRequest={setRecipeToDelete} />;
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
                    : <RecipeListScreen recipes={recipes} onSelectRecipe={viewRecipe} onDeleteRequest={setRecipeToDelete}/>;
            default:
                return <WelcomeScreen setActiveScreen={setActiveScreen} />;
        }
    };

    return (
        <div className="max-w-lg mx-auto font-sans bg-[#F9F9F5] min-h-screen">
            {/* Sync Status Indicator */}
            <div className="fixed top-4 right-4 bg-white rounded-lg shadow-md p-3 text-xs z-50">
                {syncInProgress ? (
                    <div className="flex items-center gap-2 text-blue-500">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                        <span>Synchronisation...</span>
                    </div>
                ) : isOnline ? (
                    <div>
                        <div className="flex items-center gap-2 text-green-500">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>En ligne</span>
                        </div>
                        {lastSyncTime && (
                            <div className="text-gray-500 mt-1">
                                {lastSyncTime.toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2 text-red-500">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>Hors ligne</span>
                        </div>
                        <button 
                            onClick={manualSync}
                            className="text-blue-500 underline mt-1 block"
                        >
                            Réessayer
                        </button>
                    </div>
                )}
            </div>

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
                    recipes={recipes}
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
