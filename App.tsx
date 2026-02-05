
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Recipe, Screen, GroceryListItem, Ingredient, AppData } from './types';
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
import { numberToFraction } from './services/fractionUtils';

const App: React.FC = () => {
    const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
    const [groceryList, setGroceryList] = useState<GroceryListItem[]>([]);
    const [deletedRecipeIds, setDeletedRecipeIds] = useState<string[]>([]);
    const [deletedGroceryIds, setDeletedGroceryIds] = useState<string[]>([]);

    const [isOnline, setIsOnline] = useState(false);
    const lastSyncTimeRef = useRef<Date | null>(null);
    const syncInProgressRef = useRef(false);
    const [syncInProgressUI, setSyncInProgressUI] = useState(false);

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

    const getFullLocalData = (): AppData => {
        const safeJsonParse = (key: string, defaultValue: any[] = []) => {
            try {
                const item = localStorage.getItem(key);
                const parsed = item ? JSON.parse(item) : defaultValue;
                return Array.isArray(parsed) ? parsed : defaultValue;
            } catch (e) { return defaultValue; }
        };

        return {
            recipes: safeJsonParse('family_recipes').filter((r: Recipe) => r && r.id),
            groceryList: safeJsonParse('family_grocery').filter((i: GroceryListItem) => i && i.id),
            deletedRecipeIds: safeJsonParse('family_deleted_recipes'),
            deletedGroceryIds: safeJsonParse('family_deleted_grocery')
        };
    };
    
    const setFullLocalData = (data: AppData) => {
        setRecipes(data.recipes);
        setGroceryList(data.groceryList);
        setDeletedRecipeIds(data.deletedRecipeIds || []);
        setDeletedGroceryIds(data.deletedGroceryIds || []);

        localStorage.setItem('family_recipes', JSON.stringify(data.recipes));
        localStorage.setItem('family_grocery', JSON.stringify(data.groceryList));
        localStorage.setItem('family_deleted_recipes', JSON.stringify(data.deletedRecipeIds || []));
        localStorage.setItem('family_deleted_grocery', JSON.stringify(data.deletedGroceryIds || []));
    };

    const mergeData = (local: AppData, server: AppData): AppData => {
        // 1. Merge the set of deleted IDs (union)
        const combinedDeletedRecipes = new Set([...(local.deletedRecipeIds || []), ...(server.deletedRecipeIds || [])]);
        const combinedDeletedGrocery = new Set([...(local.deletedGroceryIds || []), ...(server.deletedGroceryIds || [])]);

        // 2. Helper to merge items using "Last Write Wins"
        const mergeItems = <T extends { id: string; updatedAt?: string }>(l: T[], s: T[]): T[] => {
            const map = new Map<string, T>();
            [...l, ...s].forEach(item => {
                const existing = map.get(item.id);
                if (!existing || (item.updatedAt && (!existing.updatedAt || new Date(item.updatedAt) > new Date(existing.updatedAt)))) {
                    map.set(item.id, item);
                }
            });
            return Array.from(map.values());
        };

        // 3. Merge recipes and prune deleted ones
        const mergedRecipes = mergeItems(local.recipes, server.recipes)
            .filter(r => !combinedDeletedRecipes.has(r.id));

        // 4. Merge grocery list items
        const mergedGroceryItems = mergeItems(local.groceryList, server.groceryList)
            .filter(i => !combinedDeletedGrocery.has(i.id));

        // 5. Reorder grocery list based on the fresher device's sequence
        const getFreshestTimestamp = (list: { updatedAt?: string }[]) => 
            Math.max(0, ...list.map(i => i.updatedAt ? new Date(i.updatedAt).getTime() : 0));
        
        const localFreshest = getFreshestTimestamp(local.groceryList);
        const serverFreshest = getFreshestTimestamp(server.groceryList);

        const baseOrder = serverFreshest > localFreshest ? server.groceryList : local.groceryList;
        const groceryMap = new Map(mergedGroceryItems.map(i => [i.id, i]));
        
        const finalGrocery: GroceryListItem[] = [];
        const seenIds = new Set<string>();

        // First add items in the order they appear in the fresher list
        baseOrder.forEach(item => {
            const merged = groceryMap.get(item.id);
            if (merged && !seenIds.has(merged.id)) {
                finalGrocery.push(merged);
                seenIds.add(merged.id);
            }
        });

        // Then add any items that weren't in that device's order but exist in merged set
        groceryMap.forEach(item => {
            if (!seenIds.has(item.id)) {
                finalGrocery.push(item);
                seenIds.add(item.id);
            }
        });

        return {
            recipes: mergedRecipes,
            groceryList: finalGrocery,
            deletedRecipeIds: Array.from(combinedDeletedRecipes),
            deletedGroceryIds: Array.from(combinedDeletedGrocery)
        };
    };

    const syncData = async () => {
        if (syncInProgressRef.current) return;
        syncInProgressRef.current = true;
        setSyncInProgressUI(true);
        try {
            const online = await apiSync.checkHealth();
            setIsOnline(online);
            if (online) {
                const inFlightLocalData = getFullLocalData();
                const serverResponse = await apiSync.saveData(inFlightLocalData, lastSyncTimeRef.current);
                if (serverResponse) {
                    for (const r of serverResponse.recipes) {
                        if (r.imageBase64) {
                            try { await imageStore.saveImage(r.imageUrl, r.imageBase64); } catch (e) {}
                            delete r.imageBase64;
                        }
                    }
                    const mergedData = mergeData(getFullLocalData(), serverResponse);
                    setFullLocalData(mergedData);
                    lastSyncTimeRef.current = new Date();
                }
            } else { setFullLocalData(getFullLocalData()); }
        } catch (e) { setIsOnline(false); } finally {
            syncInProgressRef.current = false;
            setSyncInProgressUI(false);
        }
    };

    useEffect(() => {
        const init = async () => { setFullLocalData(getFullLocalData()); await syncData(); };
        init();
        const intervalId = window.setInterval(syncData, 15000);
        window.addEventListener('online', syncData);
        return () => { clearInterval(intervalId); window.removeEventListener('online', syncData); };
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
            if (audioContext.state === 'suspended') audioContext.resume();
            const now = audioContext.currentTime;
            const playNote = (freq: number, start: number, duration: number) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain); gain.connect(alarmGainNode);
                osc.type = 'sine'; osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(1, start + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                osc.start(start); osc.stop(start + duration);
            };
            playNote(523.25, now, 0.15); playNote(783.99, now + 0.2, 0.3);
        };
        sequence();
        alarmIntervalRef.current = window.setInterval(sequence, 1500);
    };

    const resetTimer = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; }
        if (audioContextRef.current && alarmGainNodeRef.current) {
            const now = audioContextRef.current.currentTime;
            alarmGainNodeRef.current.gain.cancelScheduledValues(now);
            alarmGainNodeRef.current.gain.linearRampToValueAtTime(0, now + 0.1);
        }
        setTimerEndTime(null); setTimerIsPaused(false); setRemainingOnPause(null); setTimeLeft(0);
    };

    const stopAlarm = () => { setIsAlarmModalOpen(false); resetTimer(); };
    
    useEffect(() => {
        const updateTimer = () => {
            if (timerEndTime && !timerIsPaused) {
                const remaining = Math.round((timerEndTime - Date.now()) / 1000);
                if (remaining > 0) { setTimeLeft(remaining); } 
                else { setTimeLeft(0); if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); playAlarm(); setIsAlarmModalOpen(true); }
            }
        };
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (timerEndTime && !timerIsPaused) { updateTimer(); timerIntervalRef.current = window.setInterval(updateTimer, 1000); }
        return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
    }, [timerEndTime, timerIsPaused]);

    const startTimer = (duration: number) => { if (duration <= 0) return; resetTimer(); setTimerEndTime(Date.now() + duration * 1000); setTimeLeft(duration); };
    const pauseResumeTimer = () => {
        if (timerIsPaused) { if (remainingOnPause) setTimerEndTime(Date.now() + remainingOnPause); setTimerIsPaused(false); setRemainingOnPause(null); } 
        else { if (timerEndTime) setRemainingOnPause(timerEndTime - Date.now()); setTimerIsPaused(true); }
    };

    const setActiveScreen = (screen: Screen) => { if (screen === 'search') setIsSearchOpen(true); else { setIsSearchOpen(false); setCurrentScreen(screen); } };
    const viewRecipe = (recipe: Recipe) => { setSelectedRecipe(recipe); setCurrentScreen('recipe-detail'); setIsSearchOpen(false); };
    
    const addRecipe = (recipe: Recipe) => {
        setRecipes(prev => {
            const updated = [recipe, ...prev.filter(r => r.id !== recipe.id)];
            localStorage.setItem('family_recipes', JSON.stringify(updated));
            return updated;
        });
        setCurrentScreen('recipes');
    };

    const updateRecipe = async (updatedRecipe: Recipe) => {
        let finalRecipe = { ...updatedRecipe, updatedAt: new Date().toISOString() };
        setRecipes(prev => {
            const updated = prev.map(r => r.id === finalRecipe.id ? finalRecipe : r);
            localStorage.setItem('family_recipes', JSON.stringify(updated));
            return updated;
        });
        setSelectedRecipe(prev => prev?.id === finalRecipe.id ? finalRecipe : prev);
    };

    const deleteRecipe = (id: string) => {
        setRecipes(prev => {
            const updated = prev.filter(r => r.id !== id);
            localStorage.setItem('family_recipes', JSON.stringify(updated));
            return updated;
        });
        setDeletedRecipeIds(prev => {
            const updated = [...new Set([...prev, id])];
            localStorage.setItem('family_deleted_recipes', JSON.stringify(updated));
            return updated;
        });
        if (selectedRecipe?.id === id) { setCurrentScreen('recipes'); setSelectedRecipe(null); }
        setRecipeToDelete(null);
    };
    
    const toggleGroceryItemFromIngredient = (ingredient: Ingredient) => {
        const str = `${ingredient.quantity ? `${numberToFraction(ingredient.quantity)} ` : ''}${ingredient.unit || ''} ${ingredient.name}`.trim();
        const existing = groceryList.find(item => item.name.toLowerCase() === str.toLowerCase());
        if (existing) deleteGroceryItem(existing.id); else addCustomGroceryItem(str);
    };
        
    const addCustomGroceryItem = (name: string) => {
        const newItem = { id: crypto.randomUUID(), name, completed: false, updatedAt: new Date().toISOString() };
        setGroceryList(prev => {
            const updated = [newItem, ...prev];
            localStorage.setItem('family_grocery', JSON.stringify(updated));
            return updated;
        });
    };

    const toggleGroceryItem = (id: string) => {
        setGroceryList(prev => {
            const updated = prev.map(i => i.id === id ? { ...i, completed: !i.completed, updatedAt: new Date().toISOString() } : i);
            localStorage.setItem('family_grocery', JSON.stringify(updated));
            return updated;
        });
    };

    const updateGroceryItem = (id: string, name: string) => {
        setGroceryList(prev => {
            const updated = prev.map(i => i.id === id ? { ...i, name, updatedAt: new Date().toISOString() } : i);
            localStorage.setItem('family_grocery', JSON.stringify(updated));
            return updated;
        });
    };

    const deleteGroceryItem = (id: string) => {
        setGroceryList(prev => {
            const updated = prev.filter(i => i.id !== id);
            localStorage.setItem('family_grocery', JSON.stringify(updated));
            return updated;
        });
        setDeletedGroceryIds(prev => {
            const updated = [...new Set([...prev, id])];
            localStorage.setItem('family_deleted_grocery', JSON.stringify(updated));
            return updated;
        });
    };

    const reorderGroceryItems = (list: GroceryListItem[]) => {
        const now = new Date().toISOString();
        const updated = list.map(i => ({ ...i, updatedAt: now }));
        setGroceryList(updated);
        localStorage.setItem('family_grocery', JSON.stringify(updated));
    };

    const renderScreen = () => {
        switch (currentScreen) {
            case 'welcome': return <WelcomeScreen setActiveScreen={setActiveScreen} recipes={sortedRecipes} />;
            case 'recipes': return <RecipeListScreen recipes={sortedRecipes} onSelectRecipe={viewRecipe} onDeleteRequest={setRecipeToDelete} />;
            case 'add': return <AddRecipeScreen onAddRecipe={addRecipe} setActiveScreen={setActiveScreen} allCategories={allCategories} />;
            case 'list': return <GroceryListScreen items={groceryList} onAddItem={addCustomGroceryItem} onDeleteItem={deleteGroceryItem} onUpdateItem={updateGroceryItem} onToggleItem={toggleGroceryItem} onReorderItems={reorderGroceryItems} onBack={() => setActiveScreen('recipes')} />;
            case 'timer': return <TimerScreen onBack={() => setActiveScreen('recipes')} timeLeft={timeLeft} isPaused={timerIsPaused} isActive={timerEndTime !== null} onStart={startTimer} onPauseResume={pauseResumeTimer} onReset={resetTimer} />;
            case 'recipe-detail': return selectedRecipe ? <RecipeDetailScreen recipe={selectedRecipe} onBack={() => setActiveScreen('recipes')} onDeleteRequest={setRecipeToDelete} onUpdateRecipe={updateRecipe} groceryList={groceryList} onToggleGroceryItem={toggleGroceryItemFromIngredient} recipes={recipes} /> : <RecipeListScreen recipes={sortedRecipes} onSelectRecipe={viewRecipe} onDeleteRequest={setRecipeToDelete}/>;
            default: return <WelcomeScreen setActiveScreen={setActiveScreen} recipes={sortedRecipes} />;
        }
    };

    return (
        <div className="max-w-lg mx-auto font-sans bg-[#F9F9F5] min-h-screen">
            <div className={`fixed z-50 ${currentScreen === 'recipe-detail' ? 'top-5 left-16' : 'top-5 right-5'}`}>
                {syncInProgressUI ? (
                    <div className="w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-md"><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div></div>
                ) : isOnline ? (
                    <div className="w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-md"><div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div></div>
                ) : (
                    <button onClick={syncData} className="w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-md"><div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div></button>
                )}
            </div>
            <main>{renderScreen()}</main>
            <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
            {isAlarmModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-2xl p-6 m-4 max-w-sm w-full text-center shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Temps écoulé !</h2>
                        <button onClick={stopAlarm} className="px-6 py-4 rounded-xl bg-red-500 text-white font-semibold w-full text-lg">ARRÊTER</button>
                    </div>
                </div>
            )}
            {isSearchOpen && <SearchModal recipes={sortedRecipes} onSelectRecipe={viewRecipe} onClose={() => setIsSearchOpen(false)} />}
            {recipeToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 m-4 max-w-sm w-full text-center shadow-lg">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Confirmer la suppression</h2>
                        <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer cette recette ?</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setRecipeToDelete(null)} className="px-6 py-3 rounded-xl bg-gray-200 text-gray-800 font-semibold w-full">Annuler</button>
                            <button onClick={() => deleteRecipe(recipeToDelete)} className="px-6 py-3 rounded-xl bg-red-500 text-white font-semibold w-full">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
