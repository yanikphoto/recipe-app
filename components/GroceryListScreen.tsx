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
    const inputRef = useRef<HTMLInputElement>(null);
    
    // State for visual feedback during drag
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Refs for drag logic to avoid stale closures and unnecessary re-renders
    const itemsRef = useRef(items);
    const gestureStateRef = useRef({
        isDragging: false,
        longPressTimeout: -1,
        dragStartIndex: -1,
        currentDragOverIndex: -1,
        touchStartPos: { x: 0, y: 0 },
    });
    // Refs for desktop D&D
    const desktopDragItemRef = useRef<number | null>(null);
    const desktopDragOverItemRef = useRef<number | null>(null);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const addItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            onAddItem(newItem.trim());
            setNewItem('');
        }
    };

    // --- Cleanup and Reset ---
    const resetDragState = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
        desktopDragItemRef.current = null;
        desktopDragOverItemRef.current = null;
        gestureStateRef.current.isDragging = false;
        gestureStateRef.current.dragStartIndex = -1;
        gestureStateRef.current.currentDragOverIndex = -1;
    };

    // --- Desktop Drag-and-Drop ---
    const handleDesktopDragStart = (index: number) => {
        desktopDragItemRef.current = index;
        setDraggedIndex(index);
    };

    const handleDesktopDragEnter = (index: number) => {
        if (desktopDragItemRef.current === null) return;
        desktopDragOverItemRef.current = index;
        setDragOverIndex(index);
    };

    const handleDesktopDragEnd = () => {
        const from = desktopDragItemRef.current;
        const to = desktopDragOverItemRef.current;
        if (from !== null && to !== null && from !== to) {
            let reorderedItems = [...items];
            const [movedItem] = reorderedItems.splice(from, 1);
            reorderedItems.splice(to, 0, movedItem);
            onReorderItems(reorderedItems);
        }
        resetDragState();
    };

    // --- Mobile Touch Handlers ---
    const handleTouchMove = (e: TouchEvent) => {
        const { isDragging, touchStartPos } = gestureStateRef.current;
        if (e.touches.length === 0) return;
        const touch = e.touches[0];

        if (!isDragging) {
            const deltaX = Math.abs(touch.clientX - touchStartPos.x);
            const deltaY = Math.abs(touch.clientY - touchStartPos.y);
            const SCROLL_THRESHOLD = 10;
            if (deltaX > SCROLL_THRESHOLD || deltaY > SCROLL_THRESHOLD) {
                clearTimeout(gestureStateRef.current.longPressTimeout);
            }
            return;
        }

        e.preventDefault();

        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const overLi = target?.closest('li[data-index]');
        if (overLi instanceof HTMLElement && overLi.dataset.index) {
            const overIndex = parseInt(overLi.dataset.index, 10);
            if (!isNaN(overIndex)) {
                gestureStateRef.current.currentDragOverIndex = overIndex;
                setDragOverIndex(overIndex);
            }
        }
    };

    const handleTouchEnd = () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
        clearTimeout(gestureStateRef.current.longPressTimeout);

        const { isDragging, dragStartIndex, currentDragOverIndex } = gestureStateRef.current;
        if (isDragging && dragStartIndex !== -1 && currentDragOverIndex !== -1 && dragStartIndex !== currentDragOverIndex) {
            let reorderedItems = [...itemsRef.current];
            const [movedItem] = reorderedItems.splice(dragStartIndex, 1);
            reorderedItems.splice(currentDragOverIndex, 0, movedItem);
            onReorderItems(reorderedItems);
        }
        resetDragState();
    };
    
    const handleTouchStart = (index: number, e: React.TouchEvent) => {
        gestureStateRef.current.dragStartIndex = index;
        gestureStateRef.current.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        gestureStateRef.current.longPressTimeout = window.setTimeout(() => {
            gestureStateRef.current.isDragging = true;
            setDraggedIndex(index);
            if ('vibrate' in navigator) navigator.vibrate(50);
        }, 500);

        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);
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
                />
                <button type="submit" aria-label="Ajouter l'article" className="flex-shrink-0 bg-gray-200 w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors disabled:opacity-50" disabled={!newItem.trim()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
            </form>

            {items.length > 0 ? (
                <ul className="space-y-2 relative">
                    {items.map((item, index) => {
                        const isBeingDragged = draggedIndex === index;
                        const isDragActive = draggedIndex !== null;

                        let transformStyle = '';
                        if (isDragActive && !isBeingDragged && dragOverIndex !== null) {
                            if (index > draggedIndex && index <= dragOverIndex) {
                                transformStyle = '-translate-y-full';
                            } else if (index < draggedIndex && index >= dragOverIndex) {
                                transformStyle = 'translate-y-full';
                            }
                        }
                        
                        return (
                            <li 
                                key={item.id}
                                data-index={index}
                                draggable
                                onDragStart={() => handleDesktopDragStart(index)}
                                onDragEnter={() => handleDesktopDragEnter(index)}
                                onDragEnd={handleDesktopDragEnd}
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
