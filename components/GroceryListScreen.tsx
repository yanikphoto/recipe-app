
import React, { useState, useRef, useEffect } from 'react';
import { GroceryListItem } from '../types';

type GroceryListScreenProps = {
  items: GroceryListItem[];
  onAddItem: (name: string) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, name: string) => void;
  onToggleItem: (id: string) => void;
  onReorderItems: (items: GroceryListItem[]) => void;
  onBack: () => void;
};

const GroceryListScreen: React.FC<GroceryListScreenProps> = ({ items, onAddItem, onDeleteItem, onUpdateItem, onToggleItem, onReorderItems, onBack }) => {
    const [newItem, setNewItem] = useState('');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingItemText, setEditingItemText] = useState('');
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const dragItem = useRef<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const longPressTimeoutRef = useRef<number | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

    const LONG_PRESS_DURATION = 500;
    const SCROLL_THRESHOLD = 10;

    useEffect(() => {
        if (editingItemId && editInputRef.current) editInputRef.current.focus();
    }, [editingItemId]);

    const addItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            onAddItem(newItem.trim());
            setNewItem('');
            inputRef.current?.focus();
        }
    };
    
    const handleStartEditing = (item: GroceryListItem) => {
        setEditingItemId(item.id);
        setEditingItemText(item.name);
    };

    const handleSaveEdit = () => {
        if (editingItemId && editingItemText.trim()) onUpdateItem(editingItemId, editingItemText.trim());
        setEditingItemId(null);
        setEditingItemText('');
    };

    const handleSort = () => {
        if (dragItem.current === null || dragOverIndex === null || dragItem.current === dragOverIndex) return;
        let _items = [...items];
        const draggedItemContent = _items.splice(dragItem.current, 1)[0];
        _items.splice(dragOverIndex, 0, draggedItemContent);
        onReorderItems(_items);
    };

    const resetDragState = () => {
        setActiveIndex(null); setDragOverIndex(null); dragItem.current = null; touchStartPosRef.current = null;
        if (longPressTimeoutRef.current) { clearTimeout(longPressTimeoutRef.current); longPressTimeoutRef.current = null; }
    };
    
    const handleTouchStart = (index: number, e: React.TouchEvent<HTMLLIElement>) => {
        touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        longPressTimeoutRef.current = window.setTimeout(() => {
            if ('vibrate' in navigator) navigator.vibrate(50);
            dragItem.current = index; setActiveIndex(index); longPressTimeoutRef.current = null;
        }, LONG_PRESS_DURATION);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLLIElement>) => {
        if (!touchStartPosRef.current) return;
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
        if (longPressTimeoutRef.current && (deltaX > SCROLL_THRESHOLD || deltaY > SCROLL_THRESHOLD)) {
            clearTimeout(longPressTimeoutRef.current); longPressTimeoutRef.current = null;
        }
        if (activeIndex !== null) {
            e.preventDefault();
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const overLi = target?.closest('li[data-index]');
            if (overLi instanceof HTMLElement && overLi.dataset.index) {
                const overIndex = parseInt(overLi.dataset.index, 10);
                if (!isNaN(overIndex) && overIndex !== dragOverIndex) setDragOverIndex(overIndex);
            }
        }
    };

    return (
        <div className="p-4 bg-[#F9F9F5] min-h-screen pb-24">
            <div className="flex items-center mb-6 relative h-10">
                <button onClick={onBack} className="p-2 absolute left-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                <h1 className="text-3xl font-bold text-gray-800 text-center w-full">Liste d'épicerie</h1>
            </div>

            <form onSubmit={addItem} className="flex items-center gap-3 mb-6">
                <input ref={inputRef} type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Ajouter un article..." className="w-full p-3 text-gray-700 bg-white border border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#BDEE63] text-lg" />
                <button type="submit" disabled={!newItem.trim()} className="flex-shrink-0 bg-gray-200 w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-300 disabled:opacity-50"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
            </form>

            <ul className="space-y-2 relative">
                {items.map((item, index) => {
                    if (item.id === editingItemId) return (
                        <li key={item.id} className="flex items-center justify-between p-3 rounded-2xl shadow-sm bg-white ring-2 ring-[#BDEE63]">
                            <input ref={editInputRef} type="text" value={editingItemText} onChange={(e) => setEditingItemText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingItemId(null); }} className="flex-grow bg-transparent text-gray-800 text-lg focus:outline-none" />
                            <div className="flex items-center"><button onClick={handleSaveEdit} className="text-green-500 p-1">✓</button><button onClick={() => setEditingItemId(null)} className="text-gray-400 p-1">✕</button></div>
                        </li>
                    );

                    let transformStyle = '';
                    if (activeIndex !== null && dragItem.current !== null && dragOverIndex !== null && index !== dragItem.current) {
                        if (dragItem.current < dragOverIndex) { if (index > dragItem.current && index <= dragOverIndex) transformStyle = '-translate-y-full'; }
                        else { if (index < dragItem.current && index >= dragOverIndex) transformStyle = 'translate-y-full'; }
                    }

                    return (
                        <li key={item.id} data-index={index} draggable onDragStart={() => handleTouchStart(index, null as any)} onDragEnter={() => setDragOverIndex(index)} onDragEnd={() => { handleSort(); resetDragState(); }} onDragOver={(e) => e.preventDefault()} onTouchStart={(e) => handleTouchStart(index, e)} onTouchMove={handleTouchMove} onTouchEnd={() => { if (activeIndex !== null) handleSort(); resetDragState(); }}
                            className={`flex items-center justify-between p-3 rounded-2xl shadow-sm transition-all duration-300 ${activeIndex === index ? 'opacity-75 bg-gray-100 shadow-lg scale-105 z-10' : 'bg-white z-0'} ${transformStyle}`}
                        >
                            <div className="flex items-center flex-grow min-w-0">
                                <button onClick={() => onToggleItem(item.id)} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mr-3 transition-colors ${item.completed ? 'bg-lime-500 border-lime-500' : 'border-gray-300'}`}>
                                    {item.completed && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </button>
                                <div onClick={() => handleStartEditing(item)} className="flex-grow truncate">
                                    <span className={`text-lg transition-all ${item.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.name}</span>
                                </div>
                            </div>
                            <button onClick={() => onDeleteItem(item.id)} className="text-gray-400 hover:text-red-500 ml-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default GroceryListScreen;
