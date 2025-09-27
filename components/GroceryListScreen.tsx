import React, { useState, useRef } from 'react';
import { GroceryListItem } from '../types';

type GroceryListScreenProps = {
  items: GroceryListItem[];
  onAddItem: (name: string) => void;
  onDeleteItem: (id: string) => void;
  onReorderItems: (items: GroceryListItem[]) => void;
  onToggleItem: (id: string) => void;
  onBack: () => void;
};

const GroceryListScreen: React.FC<GroceryListScreenProps> = ({ items, onAddItem, onDeleteItem, onReorderItems, onToggleItem, onBack }) => {
    const [newItem, setNewItem] = useState('');
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const addItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            onAddItem(newItem.trim());
            setNewItem('');
        }
    };

    const handleDragSort = () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
             dragItem.current = null;
             dragOverItem.current = null;
            return;
        }
        
        let _items = [...items];
        const draggedItemContent = _items.splice(dragItem.current, 1)[0];
        _items.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        onReorderItems(_items);
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
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Ajouter un article..."
                    className="w-full p-4 text-gray-700 bg-white border border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#BDEE63] focus:border-transparent text-lg"
                />
                <button type="submit" aria-label="Ajouter l'article" className="flex-shrink-0 bg-gray-200 w-14 h-14 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors disabled:opacity-50" disabled={!newItem.trim()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
            </form>

            {items.length > 0 ? (
                <ul className="space-y-3">
                    {items.map((item, index) => (
                        <li
                            key={item.id}
                            draggable
                            onDragStart={() => dragItem.current = index}
                            onDragEnter={() => dragOverItem.current = index}
                            onDragEnd={handleDragSort}
                            onDragOver={(e) => e.preventDefault()}
                            className={`flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm cursor-grab active:cursor-grabbing group transition-opacity ${item.completed ? 'opacity-50' : ''}`}
                        >
                            <div className="flex items-center flex-grow">
                                <input
                                    type="checkbox"
                                    checked={item.completed}
                                    onChange={() => onToggleItem(item.id)}
                                    className="h-6 w-6 rounded-full border-gray-300 text-[#D4F78F] focus:ring-[#BDEE63] mr-4 flex-shrink-0"
                                />
                                <span className="text-gray-400 mr-4" aria-label="Réorganiser l'article">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </span>
                                <span className={`text-gray-800 text-lg ${item.completed ? 'line-through' : ''}`}>{item.name}</span>
                            </div>
                            <button onClick={() => onDeleteItem(item.id)} className="text-gray-400 hover:text-red-500 ml-4" aria-label={`Supprimer ${item.name}`}>
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