
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Dish, DishCategory, PendingOperation } from "../models";

const KEYS = {
  dishes: "@foodmanager/dishes",
  categories: "@foodmanager/categories",
  pending: "@foodmanager/pending",
  language: "@foodmanager/language",
};

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const localStore = {
  getDishes: () => readJSON<Dish[]>(KEYS.dishes, []),
  saveDishes: (data: Dish[]) =>
    AsyncStorage.setItem(KEYS.dishes, JSON.stringify(data)),

  getCategories: () => readJSON<DishCategory[]>(KEYS.categories, []),
  saveCategories: (data: DishCategory[]) =>
    AsyncStorage.setItem(KEYS.categories, JSON.stringify(data)),

  getPending: () =>
    readJSON<PendingOperation[]>(KEYS.pending, []),
  savePending: (data: PendingOperation[]) =>
    AsyncStorage.setItem(KEYS.pending, JSON.stringify(data)),

  getLanguage: () => readJSON<"en" | "vi">(KEYS.language, "en"),
  saveLanguage: (language: "en" | "vi") =>
    AsyncStorage.setItem(KEYS.language, JSON.stringify(language)),
};
