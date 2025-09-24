import React, { useState, useEffect } from 'react';
import { GroceryItem } from '../types';
import { BackIcon, DragHandleIcon, CloseIcon, SpoonForkIcon } from '../constants';

interface GroceryListScreenProps {
  items: GroceryItem[];
  onAddItem: (text: string) => void;
  onDeleteItem: (id: string) => void;
  onReorder: (items: GroceryItem[]) => void;
  onBack: () => void;
}

const GroceryListScreen: React.FC<GroceryListScreenProps> = ({ items, onAddItem, onDeleteItem, onReorder, onBack }) => {
  const [localItems, setLocalItems] = useState(items);
  const [newItemText, setNewItemText] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemText.trim()) {
      onAddItem(newItemText.trim());
      setNewItemText('');
    }
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const newList = [...localItems];
    const [draggedItem] = newList.splice(draggedIndex, 1);
    newList.splice(dropIndex, 0, draggedItem);
    
    setLocalItems(newList); 
    onReorder(newList); 
    setDraggedIndex(null);
  };
  
  const handleDragEnd = () => setDraggedIndex(null);

  return (
    <div className="p-6 pb-24 h-screen flex flex-col">
      <header className="flex items-center">
        <button onClick={onBack} className="p-2 -ml-2">
          <BackIcon />
        </button>
        <h1 className="text-2xl font-semibold text-stone-800 ml-4">Liste d'épicerie</h1>
      </header>
      
      <form onSubmit={handleAddItem} className="flex items-center gap-3 my-6">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Ajouter un article..."
          className="w-full bg-white px-4 py-3 border border-stone-300 rounded-full focus:ring-2 focus:ring-[#BDEE63] focus:border-[#BDEE63] transition shadow-sm"
        />
        <button type="submit" className="bg-[#BDEE63] text-stone-900 font-semibold p-3 rounded-full transition-transform active:scale-90 shadow-sm disabled:bg-stone-200 disabled:cursor-not-allowed" disabled={!newItemText.trim()}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        </button>
      </form>

      <main className="flex-grow overflow-y-auto">
        {localItems.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <SpoonForkIcon />
            <p className="text-stone-500 mt-6">Votre liste d'épicerie est vide.</p>
            <p className="text-stone-400 text-sm">Ajoutez un article ci-dessus pour commencer.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {localItems.map((item, index) => (
              <li 
                key={item.id} 
                className={`flex items-center bg-white p-3 rounded-xl shadow-sm transition-opacity ${draggedIndex === index ? 'opacity-40' : 'opacity-100'}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex-shrink-0 mr-3">
                    <DragHandleIcon />
                </div>
                <span className="flex-1 text-stone-700">{item.text}</span>
                <button onClick={() => onDeleteItem(item.id)} className="p-1 rounded-full hover:bg-stone-100 ml-3 flex-shrink-0" aria-label={`Supprimer ${item.text}`}>
                    <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default GroceryListScreen;