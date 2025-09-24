import React from 'react';
import { Recipe } from './types';

export const DEFAULT_CATEGORIES = [
  "Petit-déjeuner", "Soupes", "Salades", "Pâtes", "Porc", "Poulet", "Viande rouge", "Poisson", "Dessert",
];

export const MOCK_RECIPES: Recipe[] = [
  {
    id: 'pancakes-classiques',
    name: 'Pancakes Classiques',
    imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?q=80&w=2070&auto=format&fit=crop',
    categories: ['Petit-déjeuner', 'Dessert'],
    ingredients: [
      { text: '1 1/2 tasses de farine tout usage', checked: false },
      { text: '3 1/2 cuillères à café de levure chimique', checked: false },
      { text: '1 cuillère à café de sel', checked: false },
      { text: '1 cuillère à soupe de sucre blanc', checked: false },
      { text: '1 1/4 tasses de lait', checked: false },
      { text: '1 œuf', checked: false },
      { text: '3 cuillères à soupe de beurre, fondu', checked: false },
    ],
    instructions: [
      { text: 'Dans un grand bol, tamiser la farine, la levure chimique, le sel et le sucre.', checked: false },
      { text: 'Faire un puits au centre et y verser le lait, l\'œuf et le beurre fondu ; mélanger jusqu\'à consistance lisse.', checked: false },
      { text: 'Chauffer une plaque chauffante ou une poêle légèrement huilée à feu moyen-vif.', checked: false },
      { text: 'Verser la pâte sur la plaque à l\'aide d\'environ 1/4 de tasse pour chaque pancake. Cuire jusqu\'à ce que des bulles apparaissent et que les bords soient secs, puis retourner et dorer de l\'autre côté.', checked: false },
    ],
  }
];

// --- ICONS ---

export const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="4" fill="white" />
    <path 
      fill="#374151" 
      d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" 
      transform="scale(0.7) translate(4.5, 4.5)" 
    />
  </svg>
);

export const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="4" fill="white" />
        <path strokeLinecap="round" strokeLinejoin="round" stroke="#22c55e" strokeWidth="2.5" d="m9 13 2 2 4-4" />
    </svg>
);

export const DeleteRecipeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="4" fill="white" />
    <path strokeLinecap="round" strokeLinejoin="round" stroke="#ef4444" strokeWidth="2.5" d="M15 9l-6 6m0-6l6 6" />
  </svg>
);


export const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
);

export const MoreIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
);

export const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.776 48.776 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
);

export const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

export const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
);

export const RecipesIcon = ({isActive}: {isActive: boolean}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isActive ? '#84cc16' : 'currentColor'} className="w-6 h-6">
        <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
    </svg>
);

export const SearchIcon = ({isActive}: {isActive: boolean}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isActive ? '#84cc16' : 'currentColor'} className="w-6 h-6">
        <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clipRule="evenodd" />
    </svg>
);

export const GroceryListIcon = ({isActive}: {isActive: boolean}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isActive ? '#84cc16' : 'currentColor'} className="w-6 h-6">
        <path fillRule="evenodd" d="M2.625 6.75a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H3.375a.75.75 0 0 1-.75-.75V6.75Zm0 5.25a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H3.375a.75.75 0 0 1-.75-.75V12Zm0 5.25a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H3.375a.75.75 0 0 1-.75-.75v-1.5Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M8.25 6a.75.75 0 0 1 .75.75h12a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75V6Zm0 5.25a.75.75 0 0 1 .75.75h12a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75v-1.5Zm0 5.25a.75.75 0 0 1 .75.75h12a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75v-1.5Z" clipRule="evenodd" />
    </svg>
);

export const SpoonForkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-stone-400 -rotate-45">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-2.25 2.25m0 0l-2.25 2.25M17.25 10.5l2.25-2.25m-2.25 2.25l2.25 2.25m-12.75 4.5l2.25-2.25m0 0l2.25-2.25M4.5 17.25l2.25 2.25m-2.25-2.25l-2.25 2.25M12 21.75l-2.25-2.25m0 0l-2.25-2.25M12 21.75l2.25-2.25m0 0l2.25-2.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.186 0-9.44 3.76-10.375 8.625h20.75C21.44 6.01 17.186 2.25 12 2.25Z" />
    </svg>
);

export const FoodIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-12 h-12 text-stone-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35a10 10 0 0 1-9.35-10C2.65 6.2 7.17 2 12.32 2 17.47 2 22 6.2 22 11.35c0 2.54-1.02 4.9-2.73 6.61" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v6.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 11.35c-1 .5-2.24 1-3.5 1-1.26 0-2.5-.5-3.5-1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.65 11.35c1 .5 2.24 1 3.5 1 1.26 0 2.5-.5 3.5-1" />
    </svg>
);

export const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.186 2.25 2.25 0 0 0-3.933 2.186Z" />
  </svg>
);

export const InputSearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-stone-400">
        <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clipRule="evenodd" />
    </svg>
);

export const CloseIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-stone-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const DragHandleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-stone-400 cursor-grab active:cursor-grabbing">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

export const AddToListIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-stone-400 group-hover:text-lime-600 transition-colors">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

export const AddedToListIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-500">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.06-1.06L10.5 14.19l-1.814-1.813a.75.75 0 0 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.06 0l4-4Z" clipRule="evenodd" />
    </svg>
);