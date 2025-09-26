

import React from 'react';
import { Screen } from '../types';

type BottomNavProps = {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
};

const NavItem = ({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
    {icon}
    <span className={`text-xs font-medium`}>{label}</span>
    {isActive && <div className="w-6 h-[2px] bg-gray-800 rounded-full mt-1"></div>}
  </button>
);

const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, setActiveScreen }) => {
  const isNavScreen = ['recipes', 'add', 'search', 'list', 'recipe-detail', 'timer'].includes(activeScreen);

  if (!isNavScreen) return null;

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-50">
      <div className="flex items-start justify-around h-full max-w-lg mx-auto">
        <NavItem
          label="Recettes"
          isActive={activeScreen === 'recipes' || activeScreen === 'recipe-detail'}
          onClick={() => setActiveScreen('recipes')}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>}
        />
        <NavItem
          label="Chercher"
          isActive={activeScreen === 'search'}
          onClick={() => setActiveScreen('search')}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        />
        
        <div className="w-1/5 text-center pt-2 pb-1">
             <button
                onClick={() => setActiveScreen('add')}
                aria-label="Ajouter une recette"
                className="bg-[#BDEE63] text-gray-800 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transform -translate-y-8 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#BDEE63] transition-transform hover:scale-105"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
             <div className={`relative -top-7 flex flex-col items-center transition-colors duration-200 ${activeScreen === 'add' ? 'text-gray-800' : 'text-gray-400'}`}>
                <span className="text-xs font-medium">Ajouter</span>
                {activeScreen === 'add' && <div className="w-10 h-[2px] bg-gray-800 rounded-full mt-1"></div>}
            </div>
        </div>

        <NavItem
          label="Liste"
          isActive={activeScreen === 'list'}
          onClick={() => setActiveScreen('list')}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h.008v.008H3.75V6.75zm0 5.25h.008v.008H3.75v-.008zm0 5.25h.008v.008H3.75v-.008z" /></svg>}
        />
        <NavItem
          label="Timer"
          isActive={activeScreen === 'timer'}
          onClick={() => setActiveScreen('timer')}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>
    </footer>
  );
};

export default BottomNav;