// types.ts
export type Ingredient = {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
};

export type Recipe = {
  id: string;
  title: string;
  imageUrl: string;
  categories: string[];
  ingredients: Ingredient[];
  instructions: string[];
  servings: number;
};

// FIX: Renamed GroceryItem to GroceryListItem to be more specific
export type GroceryListItem = {
    id: string;
    name: string;
    completed: boolean;
    order: number;
};

export type Screen = 'welcome' | 'recipes' | 'add' | 'search' | 'list' | 'recipe-detail' | 'timer';