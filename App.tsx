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

    // Generic function to save the full state, used for reordering and major updates.
    const saveData = async (data: { recipes: Recipe[], groceryList: GroceryListItem[] }) => {
        // Optimistic UI update
        setRecipes(data.recipes);
        setGroceryList(data.groceryList);
        localStorage.setItem('family_recipes', JSON.stringify(data.recipes));
        localStorage.setItem('family_grocery', JSON.stringify(data.groceryList));

        if (!isOnline) {
            console.warn("Offline. Changes saved locally and will sync later.");
            return;
        }

        try {
            await apiSync.saveData(data);
            setLastSyncTime(new Date());
        } catch (error) {
            console.error('Failed to save full data to API:', error);
            // Data is already saved optimistically, so no need to revert here.
            // The next sync will handle reconciliation.
        }
    };

    // Load data on initial mount & handle auto-sync.
    useEffect(() => {
        const syncAndSchedule = async () => {
            if (syncInProgress) return;
            setSyncInProgress(true);
        
            try {
                const online = await apiSync.checkHealth();
                setIsOnline(online);
        
                // Always load local data first as a fallback and for sending to the server.
                const localRecipesJSON = localStorage.getItem('family_recipes');
                const localGroceryJSON = localStorage.getItem('family_grocery');
                const localRecipes = localRecipesJSON ? JSON.parse(localRecipesJSON).filter((r: Recipe) => r && r.id) : [];
                const localGrocery = localGroceryJSON ? JSON.parse(localGroceryJSON).filter((i: GroceryListItem) => i && i.id) : [];
        
                if (online) {
                    // Send local data to be merged by the server. The server returns the canonical state.
                    // This prevents race conditions between multiple clients.
                    const finalData = await apiSync.saveData({ recipes: localRecipes, groceryList: localGrocery });
        
                    if (finalData) {
                        // The server successfully merged and returned the new source of truth.
                        const finalRecipes = finalData.recipes || [];
                        const finalGrocery = finalData.groceryList || [];
        
                        setRecipes(finalRecipes);
                        setGroceryList(finalGrocery);
                        localStorage.setItem('family_recipes', JSON.stringify(finalRecipes));
                        localStorage.setItem('family_grocery', JSON.stringify(finalGrocery));
                        setLastSyncTime(new Date());
                    } else {
                        // The sync call failed, so we're effectively offline. Fall back to local data.
                        setIsOnline(false);
                        setRecipes(localRecipes);
                        setGroceryList(localGrocery);
                        console.warn("Sync POST failed, falling back to local data.");
                    }
                } else {
                    // We are offline, so just use the local data.
                    setRecipes(localRecipes);
                    setGroceryList(localGrocery);
                }
            } catch (error) {
                console.error("Error during sync:", error);
                setIsOnline(false);
                // On any error, fall back to loading local data to ensure the app is usable.
                const localRecipesJSON = localStorage.getItem('family_recipes');
                if (localRecipesJSON) setRecipes(JSON.parse(localRecipesJSON).filter((r: Recipe) => r && r.id));
                const localGroceryJSON = localStorage.getItem('family_grocery');
                if (localGroceryJSON) setGroceryList(JSON.parse(localGroceryJSON).filter((i: GroceryListItem) => i && i.id));
            } finally {
                setSyncInProgress(false);
            }
        };

        syncAndSchedule(); // Initial load
        const interval = setInterval(syncAndSchedule, 30000); // Auto-sync
        
        return () => clearInterval(interval);
    }, []);

    const manualSync = () => {
        // This is now handled by the useEffect logic, just need to trigger a check
        const event = new Event('online');
        window.dispatchEvent(event);
    }

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
        setRecipes(updatedRecipes);
        localStorage.setItem('family_recipes', JSON.stringify(updatedRecipes));
        setCurrentScreen('recipes');
        setIsSearchOpen(false);
        
        if (isOnline) {
            await apiSync.addRecipeOnly(recipe);
        }
    };

    const updateRecipe = async (updatedRecipe: Recipe) => {
        const updatedRecipes = recipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r);
        setRecipes(updatedRecipes);
        localStorage.setItem('family_recipes', JSON.stringify(updatedRecipes));
        if (selectedRecipe?.id === updatedRecipe.id) {
            setSelectedRecipe(updatedRecipe);
        }

        if (isOnline) {
             // This is an add/update operation
            await apiSync.addRecipeOnly(updatedRecipe);
        }
    };

    const deleteRecipe = async (id: string) => {
        const updatedRecipes = recipes.filter(r => r.id !== id);
        setRecipes(updatedRecipes);
        localStorage.setItem('family_recipes', JSON.stringify(updatedRecipes));
        
        if (selectedRecipe?.id === id) {
            setCurrentScreen('recipes');
            setSelectedRecipe(null);
        }
        setRecipeToDelete(null);

        if(isOnline) {
            await apiSync.deleteRecipe(id);
        }
    };
    
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

        if (existingItem) {
            await deleteGroceryItem(existingItem.id);
        } else {
            await addCustomGroceryItem(ingredientString);
        }
    };
        
    const addCustomGroceryItem = async (name: string) => {
        const newItem: GroceryListItem = { id: crypto.randomUUID(), name, completed: false };
        const updatedItems = [newItem, ...groceryList];
        setGroceryList(updatedItems);
        localStorage.setItem('family_grocery', JSON.stringify(updatedItems));
        
        if (isOnline) {
            await apiSync.addGroceryItem(newItem);
        }
    };

    const deleteGroceryItem = async (id: string) => {
        const updatedItems = groceryList.filter(item => item.id !== id);
        setGroceryList(updatedItems);
        localStorage.setItem('family_grocery', JSON.stringify(updatedItems));
        
        if (isOnline) {
            await apiSync.deleteGroceryItem(id);
        }
    };

    const reorderGroceryItems = async (reorderedList: GroceryListItem[]) => {
        // Reordering requires sending the full list
        await saveData({ recipes, groceryList: reorderedList });
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