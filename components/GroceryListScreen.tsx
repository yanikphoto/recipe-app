import React, { useState, useRef } from 'react';
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
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const longPressTimeoutRef = useRef<number | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

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
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
            return;
        }
        
        let _items = [...items];
        const draggedItemContent = _items.splice(dragItem.current, 1)[0];
        _items.splice(dragOverItem.current, 0, draggedItemContent);
        onReorderItems(_items);
    };

    const resetDragState = () => {
        setActiveIndex(null);
        dragItem.current = null;
        dragOverItem.current = null;
        touchStartPosRef.current = null;
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
    };
    
    // --- Desktop Drag Handlers ---
    const handleDragStart = (index: number) => {
        dragItem.current = index;
        setActiveIndex(index);
    };

    const handleDragEnd = () => {
        handleSort();
        resetDragState();
    };

    // --- Mobile Touch Handlers ---
    const handleTouchStart = (index: number, e: React.TouchEvent<HTMLLIElement>) => {
        touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        longPressTimeoutRef.current = window.setTimeout(() => {
            if ('vibrate' in navigator) navigator.vibrate(50);
            dragItem.current = index;
            setActiveIndex(index);
            longPressTimeoutRef.current = null;
        }, LONG_PRESS_DURATION);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLLIElement>) => {
        if (!touchStartPosRef.current) return;

        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);

        // If scrolling, cancel the long press
        if (longPressTimeoutRef.current && (deltaX > SCROLL_THRESHOLD || deltaY > SCROLL_THRESHOLD)) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }

        // If in drag mode, update the drop target
        if (activeIndex !== null) {
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const overLi = target?.closest('li[data-index]');
            if (overLi instanceof HTMLElement && overLi.dataset.index) {
                const overIndex = parseInt(overLi.dataset.index, 10);
                if (!isNaN(overIndex)) dragOverItem.current = overIndex;
            }
        }
    };

    const handleTouchEnd = () => {
        if (activeIndex !== null) handleSort();
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
                <ul className="space-y-2">
                    {items.map((item, index) => (
                        <li 
                            key={item.id}
                            data-index={index}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => (dragOverItem.current = index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            onTouchStart={(e) => handleTouchStart(index, e)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            style={{ touchAction: 'none' }}
                            className={`flex items-center justify-between p-3 rounded-2xl shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200 ${
                                activeIndex === index ? 'opacity-75 bg-gray-100 shadow-lg scale-105' : 'bg-white'
                            }`}
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
                    ))}
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