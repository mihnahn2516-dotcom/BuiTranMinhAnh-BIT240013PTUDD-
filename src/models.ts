
export type DishCategory = {
  id: string;
  BIT240013_Name: string;
  BIT240013_Description: string;
};

export type Dish = {
  id: string;
  BIT240013_Name: string;
  BIT240013_Price: number;
  BIT240013_PreparationTime: number;
  BIT240013_IsAvailable: boolean;
  BIT240013_Description: string;
  BIT240013_DishCategoryId: string;
  BIT240013_DishImage: string;
  BIT240013_IsThumbnail: boolean;
};

export type PendingOperation = {
  id: string;
  resource: "dish" | "category";
  action: "create" | "update" | "delete";
  recordId: string;
  data?: Dish | DishCategory;
  createdAt: number;
};

export const API_BASE =
  "https://mockapi.io/projects/6ad71693f71f154ac487bd0b";

export const DISH_URL = `${API_BASE}/BIT240013_Dish`;
export const CATEGORY_URL = `${API_BASE}/BIT240013_DishCategory`;
