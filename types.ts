// types.ts
export type Ingredient = {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  isSectionHeader?: boolean;
};

export type Recipe = {
  id: string;
  title: string;
  imageUrl: string;
  categories: string[];
  ingredients: Ingredient[];
  instructions: string[];
  servings: number;
  servingsUnit?: string;
  imageBase64?: string;
  updatedAt?: string;
};

export type GroceryListItem = {
    id: string;
    name: string;
    completed: boolean;
    updatedAt?: string;
};

export type Screen = 'welcome' | 'recipes' | 'add' | 'search' | 'list' | 'recipe-detail' | 'timer';

export type AppData = {
  recipes: Recipe[];
  groceryList: GroceryListItem[];
  lastUpdated?: string;
  deletedRecipeIds?: string[];
  deletedGroceryIds?: string[];
};