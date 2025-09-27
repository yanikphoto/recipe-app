import { db } from './firebaseConfig';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch, query, orderBy } from 'firebase/firestore';
import { Recipe, GroceryListItem, Ingredient } from '../types';

const RECIPES_COLLECTION = 'recipes';
const GROCERY_LIST_COLLECTION = 'groceryList';

// Type guard for Ingredient
const isIngredient = (obj: any): obj is Ingredient => {
    return obj && typeof obj.name === 'string';
}

// Type guard for Recipe
const isRecipe = (obj: any): obj is Recipe => {
    return obj && typeof obj.title === 'string' && Array.isArray(obj.ingredients) && obj.ingredients.every(isIngredient);
}

// Recipes
export const getRecipes = async (): Promise<Recipe[]> => {
    const querySnapshot = await getDocs(collection(db, RECIPES_COLLECTION));
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        if (isRecipe(data)) {
            return { ...data, id: doc.id };
        }
        // Handle cases where data doesn't match the Recipe type
        console.warn("Invalid recipe data found in Firestore: ", data);
        return null;
    }).filter((recipe): recipe is Recipe => recipe !== null);
};


export const addRecipe = async (recipe: Omit<Recipe, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, RECIPES_COLLECTION), recipe);
    return docRef.id;
};

export const updateRecipe = async (id: string, recipe: Partial<Recipe>): Promise<void> => {
    const recipeRef = doc(db, RECIPES_COLLECTION, id);
    await updateDoc(recipeRef, recipe);
};

export const deleteRecipe = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, RECIPES_COLLECTION, id));
};

// Grocery List
export const getGroceryList = async (): Promise<GroceryListItem[]> => {
    const q = query(collection(db, GROCERY_LIST_COLLECTION), orderBy('order'));
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => ({ ...doc.data() as Omit<GroceryListItem, 'id'>, id: doc.id }));

    // Basic validation and data repair
    const validItems = items.filter(item => typeof item.order === 'number');
    if (validItems.length !== items.length) {
        console.warn("Some grocery list items were missing an 'order' field and have been excluded.");
    }

    return validItems as GroceryListItem[];
};

export const addGroceryListItem = async (item: Omit<GroceryListItem, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, GROCERY_LIST_COLLECTION), item);
    return docRef.id;
};

export const updateGroceryListItem = async (id: string, item: Partial<GroceryListItem>): Promise<void> => {
    await updateDoc(doc(db, GROCERY_LIST_COLLECTION, id), item);
};

export const deleteGroceryListItem = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, GROCERY_LIST_COLLECTION, id));
};

export const reorderGroceryListItems = async (items: GroceryListItem[]): Promise<void> => {
    if (items.length === 0) return;
    const batch = writeBatch(db);
    items.forEach((item, index) => {
        const docRef = doc(db, GROCERY_LIST_COLLECTION, item.id);
        batch.update(docRef, { order: index });
    });
    await batch.commit();
};