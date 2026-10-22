
import { Dish, DishCategory } from "../models";

const BASE_URL =
  "https://6ad71693f71f154ac487bd0a.mockapi.io";

const DISH_URL = 'https://6ad71693f71f154ac487bd0a.mockapi.io/BIT240013_Dish';
const CATEGORY_URL = "https://6ad71693f71f154ac487bd0a.mockapi.io/BIT240013_DishCategory";

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    throw new Error(
      `API error ${response.status}: ${
        errorText || response.statusText
      }`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export const api = {
  // ==================== DISHES ====================

  getDishes: () => request<Dish[]>(DISH_URL),

  createDish: (data: Omit<Dish, "id">) =>
    request<Dish>(DISH_URL, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateDish: (id: string, data: Partial<Dish>) =>
    request<Dish>(
      `${DISH_URL}/${encodeURIComponent(String(id))}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    ),

  deleteDish: (id: string) =>
    request<void>(
      `${DISH_URL}/${encodeURIComponent(String(id))}`,
      { method: "DELETE" }
    ),

  // ==================== CATEGORIES ====================

  getCategories: () =>
    request<DishCategory[]>(CATEGORY_URL),

  createCategory: (
    data: Omit<DishCategory, "id">
  ) =>
    request<DishCategory>(CATEGORY_URL, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCategory: (
    id: string,
    data: Partial<DishCategory>
  ) =>
    request<DishCategory>(
      `${CATEGORY_URL}/${encodeURIComponent(String(id))}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    ),

  deleteCategory: (id: string) =>
    request<void>(
      `${CATEGORY_URL}/${encodeURIComponent(String(id))}`,
      { method: "DELETE" }
    ),
};
