export enum Page {
  Welcome,
  RecipeList,
  AddRecipe,
  RecipeDetail,
  GroceryList,
}

export interface GroceryItem {
  id: string;
  text: string;
}

export interface Ingredient {
  text: string;
  checked: boolean;
}

export interface Instruction {
  text: string;
  checked: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  imageUrl: string;
  categories: string[];
  ingredients: Ingredient[];
  instructions: Instruction[];
}