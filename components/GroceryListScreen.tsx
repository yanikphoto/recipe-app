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
    
    const inputRef = useRef<HTMLInputElement>(null);
    const itemsRef = useRef(items);
    const dragItemRef = useRef<number | null>(null);
    const dragOverItemRef = useRef<number | null>(null);
    const longPressTimeoutRef = useRef<number | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        // Keep a ref to the latest items to avoid stale closures in event handlers
        itemsRef.current = items;
    }, [items]);

    const LONG_PRESS_DURATION = 500;
    const SCROLL_THRESHOLD = 10;

    const addItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            onAddItem(newItem.trim());
            setNewItem('');
            inputRef.current?.focus();
        }
    };
    
    // --- Desktop Drag-and-Drop Handlers ---
    const handleDragStart = (index: number) => {
        dragItemRef.current = index;
        setActiveIndex(index);
    };
    
    const handleDragEnter = (index: number) => {
        if (activeIndex === null) return; // Only process if a drag has started
        dragOverItemRef.current = index;
        setDragOverIndex(index);
    };

    const handleDragEnd = () => {
        if (dragItemRef.current !== null && dragOverItemRef.current !== null) {
            const from = dragItemRef.current;
            const to = dragOverItemRef.current;
            if (from !== to) {
                let _items = [...items];
                const [reorderedItem] = _items.splice(from, 1);
                _items.splice(to, 0, reorderedItem);
                onReorderItems(_items);
            }
        }
        // Reset state for desktop D&D
        setActiveIndex(null);
        setDragOverIndex(null);
        dragItemRef.current = null;
        dragOverItemRef.current = null;
    };

    // --- Mobile Touch Handlers ---
    const handleTouchStart = (index: number, e: React.TouchEvent) => {
        touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        dragItemRef.current = index;

        const handleMove = (moveEvent: TouchEvent) => {
            if (!touchStartPosRef.current) {
                handleEnd(); // Should not happen, but safeguard
                return;
            }

            const touch = moveEvent.touches[0];
            const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
            const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);

            // If timer is running and user moves, it's a scroll.
            if (longPressTimeoutRef.current && (deltaX > SCROLL_THRESHOLD || deltaY > SCROLL_THRESHOLD)) {
                clearTimeout(longPressTimeoutRef.current);
                longPressTimeoutRef.current = null;
            }
            
            // If dragging is active, prevent scroll and update position.
            if (isDraggingRef.current) {
                moveEvent.preventDefault();

                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                const overLi = target?.closest('li[data-index]');
                if (overLi instanceof HTMLElement && overLi.dataset.index) {
                    const overIndex = parseInt(overLi.dataset.index, 10);
                    if (!isNaN(overIndex)) {
                        dragOverItemRef.current = overIndex;
                        setDragOverIndex(overIndex);
                    }
                }
            }
        };

        const handleEnd = () => {
            // Always clean up listeners
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
            window.removeEventListener('touchcancel', handleEnd);

            if (longPressTimeoutRef.current) {
                clearTimeout(longPressTimeoutRef.current);
            }

            if (isDraggingRef.current && dragItemRef.current !== null && dragOverItemRef.current !== null) {
                const from = dragItemRef.current;
                const to = dragOverItemRef.current;
                if (from !== to) {
                    let _items = [...itemsRef.current];
                    const [reorderedItem] = _items.splice(from, 1);
                    _items.splice(to, 0, reorderedItem);
                    onReorderItems(_items);
                }
            }
            
            // Reset all state and refs
            isDraggingRef.current = false;
            dragItemRef.current = null;
            dragOverItemRef.current = null;
            touchStartPosRef.current = null;
            setActiveIndex(null);
            setDragOverIndex(null);
        };
        
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
        window.addEventListener('touchcancel', handleEnd);
        
        longPressTimeoutRef.current = window.setTimeout(() => {
            if ('vibrate' in navigator) navigator.vibrate(50);
            isDraggingRef.current = true;
            setActiveIndex(index);
            longPressTimeoutRef.current = null;
        }, LONG_PRESS_DURATION);
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
                        const isBeingDragged = activeIndex === index;
                        const isDragActive = activeIndex !== null;

                        if (isDragActive && !isBeingDragged && dragOverIndex !== null) {
                            if (index > activeIndex && index <= dragOverIndex) {
                                transformStyle = '-translate-y-full'; // Item moves up
                            } else if (index < activeIndex && index >= dragOverIndex) {
                                transformStyle = 'translate-y-full'; // Item moves down
                            }
                        }
                        
                        return (
                            <li 
                                key={item.id}
                                data-index={index}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragEnter={() => handleDragEnter(index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                onTouchStart={(e) => handleTouchStart(index, e)}
                                className={`flex items-center justify-between p-3 rounded-2xl shadow-sm cursor-grab active:cursor-grabbing transition-all duration-300 ${
                                    isBeingDragged
                                        ? 'opacity-75 bg-gray-100 shadow-lg scale-105 z-10' 
                                        : 'bg-white z-0'
                                } ${transformStyle}`}
                            >
                                <div className="flex items-center pointer-events-none">
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
