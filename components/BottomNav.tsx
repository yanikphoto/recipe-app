import React from 'react';
import { Page } from '../types';
import { BrowseIcon, SearchIcon, GroceryListIcon } from '../constants';

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onSearchClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate, onSearchClick }) => {
  const navItems = [
    { page: Page.RecipeList, label: 'Parcourir', icon: BrowseIcon },
    { page: Page.AddRecipe, label: 'Ajouter', icon: () => <div /> },
    { page: Page.Welcome, label: 'Chercher', icon: SearchIcon }, // Page is a placeholder
    { page: Page.GroceryList, label: 'Liste', icon: GroceryListIcon },
  ];

  if (currentPage === Page.Welcome) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-sm border-t border-stone-200 flex justify-around items-center max-w-md mx-auto z-10">
      {navItems.map((item, index) => {
        if (item.page === Page.AddRecipe) {
          return (
            <div key={item.page} className="relative w-1/4 h-full flex justify-center">
                <button
                onClick={() => onNavigate(Page.AddRecipe)}
                className="absolute -top-6 w-16 h-16 bg-[#BDEE63] text-stone-900 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90"
                >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                </button>
                 <span className="absolute bottom-3 text-xs font-medium text-stone-600">Ajouter</span>
            </div>
          );
        }

        const isActive = currentPage === item.page;
        const Icon = item.icon;

        return (
          <button
            key={item.page}
            onClick={() => {
                if(item.label === 'Chercher'){
                    onSearchClick();
                    return;
                }
                onNavigate(item.page)
            }}
            className="flex flex-col items-center justify-center w-1/4 h-full text-stone-500"
          >
            <Icon isActive={isActive} />
            <span className={`text-xs mt-1 font-medium ${isActive ? 'text-[#BDEE63]' : 'text-stone-500'}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;