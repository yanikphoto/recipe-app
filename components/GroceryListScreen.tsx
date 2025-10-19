import React, { useState, useRef, useEffect } from 'react';
import { GroceryListItem } from '../types';

type GroceryListScreenProps = {
  items: GroceryListItem[];
  onAddItem: (name: string) => void;
  onDeleteItem: (id: string) => void;
  onReorderItems: (items: GroceryListItem[]) => void;
  onBack: () => void;
};

const GroceryListScreen: React.FC<GroceryListScreenProps> = ({ items, onAddItem, onDeleteItem, onReorderItems, onBack }) => {
    const [newItem, setNewItem] = useState('');
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    
    // Refs to hold state that needs to be accessed synchronously in event handlers
    const dragItem = useRef<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const longPressTimeoutRef = useRef<number | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false); // Ref to track dragging state directly

    // Effect for the global listener to prevent scrolling on iOS.
    // This now relies on isDraggingRef, which we manage manually.
    useEffect(() => {
        const handleGlobalTouchMove = (e: TouchEvent) => {
            if (isDraggingRef.current) {
                e.preventDefault();
            }
        };

        window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });

        return () => {
            window.removeEventListener('touchmove', handleGlobalTouchMove);
        };
    }, []); // Empty dependency array, runs once.

    const LONG_PRESS_DURATION = 500; // ms
    const SCROLL_THRESHOLD = 10; // pixels

    const addItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            onAddItem(newItem.trim());
            setNewItem('');
            inputRef.current?.focus();
        }
    };
    
    const handleSort = () => {
        if (dragItem.current === null || dragOverIndex === null || dragItem.current === dragOverIndex) {
            return;
        }
        
        let _items = [...items];
        const draggedItemContent = _items.splice(dragItem.current, 1)[0];
        _items.splice(dragOverIndex, 0, draggedItemContent);
        onReorderItems(_items);
    };
    
    // A single function to clean up all drag-related state.
    const resetDragState = () => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
        isDraggingRef.current = false;
        dragItem.current = null;
        touchStartPosRef.current = null;
        setActiveIndex(null);
        setDragOverIndex(null);
    };
    
    // --- Desktop Drag Handlers ---
    const handleDragStart = (index: number) => {
        dragItem.current = index;
        setActiveIndex(index);
    };

    const handleDragEnd = () => {
        handleSort();
        // Use a simpler reset for desktop
        dragItem.current = null;
        setActiveIndex(null);
        setDragOverIndex(null);
    };

    // --- Mobile Touch Handlers ---
    const handleTouchStart = (index: number, e: React.TouchEvent<HTMLLIElement>) => {
        // Prevent multiple touch starts from creating issues
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);

        touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        longPressTimeoutRef.current = window.setTimeout(() => {
            if ('vibrate' in navigator) navigator.vibrate(50);
            isDraggingRef.current = true;
            dragItem.current = index;
            setActiveIndex(index);
            longPressTimeoutRef.current = null;
        }, LONG_PRESS_DURATION);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLLIElement>) => {
        if (!touchStartPosRef.current) return;
        const touch = e.touches[0];

        // If user moves before long press timer, it's a scroll, so cancel drag initiation.
        if (longPressTimeoutRef.current) {
            const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
            const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
            if (deltaX > SCROLL_THRESHOLD || deltaY > SCROLL_THRESHOLD) {
                clearTimeout(longPressTimeoutRef.current);
                longPressTimeoutRef.current = null;
            }
        }

        // If dragging is active, find which element we are dragging over.
        // We check our ref, which is guaranteed to be up-to-date.
        if (isDraggingRef.current) {
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const overLi = target?.closest('li[data-index]');
            if (overLi instanceof HTMLElement && overLi.dataset.index) {
                const overIndex = parseInt(overLi.dataset.index, 10);
                if (!isNaN(overIndex) && overIndex !== dragOverIndex) {
                    setDragOverIndex(overIndex);
                }
            }
        }
    };

    const handleTouchEndOrCancel = () => {
        if (isDraggingRef.current) {
            handleSort();
        }
        // Always reset state on touch end/cancel.
        resetDragState();
    };


    return (
        <div className="p-4 bg-[#F9F9F5] min-h-screen pb-24">
            <div className="flex items-center mb-6 relative h-10">
                <button onClick={onBack} className="p-2 absolute left-0" aria-label="Retour">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-3xl font-bold text-gray-800 text-center w-full">Liste d'épicerie</h1>
            </div>

            <form onSubmit={addItem} className="flex items-center gap-3 mb-6">
                <input
                    ref={inputRef}
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Ajouter un article..."
                    className="w-full p-3 text-gray-700 bg-white border border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#BDEE63] focus:border-transparent text-lg"
                    autoFocus
                />
                <button type="submit" aria-label="Ajouter l'article" className="flex-shrink-0 bg-gray-200 w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors disabled:opacity-50" disabled={!newItem.trim()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
            </form>

            {items.length > 0 ? (
                <ul className="space-y-2 relative">
                    {items.map((item, index) => {
                        let transformStyle = '';
                        const isDragging = activeIndex !== null;
                        const dragStartIndex = dragItem.current; // can be from touch or desktop drag

                        if (isDragging && dragStartIndex !== null && dragOverIndex !== null && index !== dragStartIndex) {
                            if (dragStartIndex < dragOverIndex) { // Dragging down
                                if (index > dragStartIndex && index <= dragOverIndex) {
                                    transformStyle = '-translate-y-full';
                                }
                            } else { // Dragging up
                                if (index < dragStartIndex && index >= dragOverIndex) {
                                    transformStyle = 'translate-y-full';
                                }
                            }
                        }
                        
                        return (
                            <li 
                                key={item.id}
                                data-index={index}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragEnter={() => setDragOverIndex(index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                onTouchStart={(e) => handleTouchStart(index, e)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEndOrCancel}
                                onTouchCancel={handleTouchEndOrCancel}
                                className={`flex items-center justify-between p-3 rounded-2xl shadow-sm cursor-grab active:cursor-grabbing transition-all duration-300 ${
                                    activeIndex === index 
                                        ? 'opacity-75 bg-gray-100 shadow-lg scale-105 z-10' 
                                        : 'bg-white z-0'
                                } ${transformStyle}`}
                            >
                                <div className="flex items-center">
                                    <span className="text-gray-400 mr-4" aria-label="Réorganiser l'article">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    </span>
                                    <span className="text-gray-800 text-lg">{item.name}</span>
                                </div>
                                <button onClick={() => onDeleteItem(item.id)} className="text-gray-400 hover:text-red-500" aria-label={`Supprimer ${item.name}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="text-center py-16 text-gray-500">
                    <p>Votre liste est vide.</p>
                </div>
            )}
        </div>
    );
};

export default GroceryListScreen;