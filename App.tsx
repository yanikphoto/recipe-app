import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Recipe, Screen, GroceryListItem, Ingredient } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import AddRecipeScreen from './components/AddRecipeScreen';
import RecipeListScreen from './components/RecipeListScreen';
import RecipeDetailScreen from './components/RecipeDetailScreen';
import GroceryListScreen from './components/GroceryListScreen';
import BottomNav from './components/BottomNav';
import SearchModal from './components/SearchModal';
import { DEFAULT_CATEGORIES } from './constants';
import TimerScreen from './components/TimerScreen';
import SyncScreen from './components/SyncScreen';
import Spinner from './components/Spinner';

const RECIPES_STORAGE_KEY = 'nosRecettes.recipes';
const GROCERY_LIST_STORAGE_KEY = 'nosRecettes.groceryList';

type SyncData = {
    recipes: Recipe[];
    groceryList: GroceryListItem[];
};

// Helper function to decompress a Gzipped Uint8Array to a string
const decompressUint8Array = async (input: Uint8Array): Promise<string> => {
    const stream = new Blob([input]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const blob = await new Response(decompressedStream).blob();
    return blob.text();
};

const MOCK_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Pancakes Classiques',
    imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?q=80&w=2070&auto=format&fit=crop',
    categories: ['Déjeuner', 'Dessert'],
    ingredients: [
      { id: 'i11', name: 'Farine', quantity: 1.5, unit: 'tasses' },
      { id: 'i12', name: 'Sucre', quantity: 2, unit: 'c.à.s' },
      { id: 'i13', name: 'Levure chimique', quantity: 2, unit: 'c.à.c' },
      { id: 'i14', name: 'Sel', quantity: 0.5, unit: 'c.à.c' },
      { id: 'i15', name: 'Lait', quantity: 1.25, unit: 'tasses' },
      { id: 'i16', name: 'Oeuf', quantity: 1 },
      { id: 'i17', name: 'Beurre fondu', quantity: 2, unit: 'c.à.s' },
    ],
    instructions: [
      'Mélanger les ingrédients secs.',
      'Ajouter le lait, l\'oeuf et le beurre fondu.',
      'Mélanger jusqu\'à obtenir une pâte homogène.',
      'Faire cuire dans une poêle chaude.',
    ],
    servings: 4,
  },
];

const App: React.FC = () => {
    const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    const [recipes, setRecipes] = useState<Recipe[]>(() => {
        try {
            const storedRecipes = window.localStorage.getItem(RECIPES_STORAGE_KEY);
            return storedRecipes ? JSON.parse(storedRecipes) : MOCK_RECIPES;
        } catch (error) {
            console.error("Failed to read recipes from localStorage", error);
            return MOCK_RECIPES;
        }
    });
    
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
    const [dataToImport, setDataToImport] = useState<SyncData | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [groceryList, setGroceryList] = useState<GroceryListItem[]>(() => {
        try {
            const storedList = window.localStorage.getItem(GROCERY_LIST_STORAGE_KEY);
            return storedList ? JSON.parse(storedList) : [];
        } catch (error) {
            console.error("Failed to read grocery list from localStorage", error);
            return [];
        }
    });

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
    
    useEffect(() => {
        try {
            window.localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(recipes));
        } catch (error) {
            console.error("Failed to save recipes to localStorage", error);
        }
    }, [recipes]);

    useEffect(() => {
        try {
            window.localStorage.setItem(GROCERY_LIST_STORAGE_KEY, JSON.stringify(groceryList));
        } catch (error) {
            console.error("Failed to save grocery list to localStorage", error);
        }
    }, [groceryList]);
    
    // Check for sync data in URL on initial load
    useEffect(() => {
        const processUrlData = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const syncId = urlParams.get('syncId');

            if (syncId) {
                setIsSyncing(true);
                try {
                    const response = await fetch(`/api/sync?id=${syncId}`);
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || `Échec de la récupération des données de synchronisation: ${response.statusText}`);
                    }
                    
                    const compressedDataBlob = await response.blob();
                    const compressedData = new Uint8Array(await compressedDataBlob.arrayBuffer());
                    const jsonString = await decompressUint8Array(compressedData);
                    const parsedData = JSON.parse(jsonString);
                    
                    if (parsedData && Array.isArray(parsedData.recipes) && Array.isArray(parsedData.groceryList)) {
                        setDataToImport(parsedData);
                    } else {
                        throw new Error("Les données de synchronisation sont invalides.");
                    }
                } catch (e: any) {
                    console.error("Failed to process sync data", e);
                    alert(e.message || "Les données de synchronisation sont invalides, corrompues ou ont expiré.");
                } finally {
                    setIsSyncing(false);
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
        };
        
        processUrlData();
    }, []);

    const allCategories = useMemo(() => {
        const categoriesFromRecipes = recipes.flatMap(r => r.categories);
        return [...new Set([...DEFAULT_CATEGORIES, ...categoriesFromRecipes])];
    }, [recipes]);

    const activeScreen = isSearchOpen ? 'search' : currentScreen;

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
        setRecipes(prev => [recipe, ...prev]);
        setCurrentScreen('recipes');
        setIsSearchOpen(false);
    }

    const updateRecipe = (updatedRecipe: Recipe) => {
        setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
        if (selectedRecipe?.id === updatedRecipe.id) {
            setSelectedRecipe(updatedRecipe);
        }
    };

    const deleteRecipe = (id: string) => {
        setRecipes(prev => prev.filter(r => r.id !== id));
        setRecipeToDelete(null);
        if (selectedRecipe?.id === id) {
            setCurrentScreen('recipes');
            setSelectedRecipe(null);
        }
    };
    
    const toggleGroceryItemFromIngredient = (ingredient: Ingredient) => {
        const ingredientString = `${ingredient.quantity ? `${ingredient.quantity} ` : ''}${ingredient.unit || ''} ${ingredient.name}`.trim();
        const existingItem = groceryList.find(item => item.name.toLowerCase() === ingredientString.toLowerCase());

        if (existingItem) {
            setGroceryList(prev => prev.filter(item => item.id !== existingItem.id));
        } else {
            const newItem: GroceryListItem = {
                id: crypto.randomUUID(),
                name: ingredientString,
                completed: false,
            };
            setGroceryList(prev => [...prev, newItem]);
        }
    };
        
    const addCustomGroceryItem = (name: string) => {
        const newItem: GroceryListItem = { id: crypto.randomUUID(), name, completed: false };
        setGroceryList(prev => [newItem, ...prev]);
    };

    const deleteGroceryItem = (id: string) => {
        setGroceryList(prev => prev.filter(item => item.id !== id));
    };

    const reorderGroceryItems = (reorderedList: GroceryListItem[]) => {
        setGroceryList(reorderedList);
    };
    
    const handleConfirmImport = () => {
        if (dataToImport) {
            setRecipes(dataToImport.recipes);
            setGroceryList(dataToImport.groceryList);
            setDataToImport(null);
            setCurrentScreen('recipes'); // Navigate to recipes to see the new data
        }
    };

    const handleCancelImport = () => {
        setDataToImport(null);
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
            case 'sync':
                return <SyncScreen recipes={recipes} groceryList={groceryList} onBack={() => setActiveScreen('recipes')} />;
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
            <main>{renderScreen()}</main>
            <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
            
            {isSyncing && (
                <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-[100]">
                    <Spinner />
                    <p className="text-white mt-2">Récupération des données...</p>
                </div>
            )}

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
            
            {dataToImport && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300">
                    <div className="bg-white rounded-2xl p-6 m-4 max-w-sm w-full text-center shadow-lg transform transition-all duration-300 scale-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Importer des données ?</h2>
                        <p className="text-gray-600 mb-6">Cela remplacera toutes les recettes et les articles d'épicerie actuels sur cet appareil. Continuer ?</p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={handleCancelImport}
                                className="px-6 py-3 rounded-xl bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors w-full"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                className="px-6 py-3 rounded-xl bg-[#D4F78F] text-gray-800 font-semibold hover:bg-[#BDEE63] transition-colors w-full"
                            >
                                Importer
                            </button>
                        </div>
                    </div>
                </div>
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