import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import NetInfo from "@react-native-community/netinfo";

import { api } from "./src/services/api";
import { Dish, DishCategory } from "./src/models";
import { localStore } from "./src/storage/localStore";
import { Language } from "./src/utils/i18n";

type Tab = "dishes" | "categories";
type StatusFilter = "all" | "available" | "unavailable";
type SortType = "name" | "priceAsc" | "priceDesc" | "timeAsc";

type DishImage = { url: string; isThumbnail: boolean };

type DishForm = {
  BIT240013_Name: string;
  BIT240013_Price: string;
  BIT240013_PreparationTime: string;
  BIT240013_IsAvailable: boolean;
  BIT240013_Description: string;
  BIT240013_DishCategoryId: string;
  BIT240013_DishImage: string;
  BIT240013_IsThumbnail: boolean;
};

const DEFAULT_IMAGE = "";
const MAX_IMAGES = 5;
const IMGBB_KEY = "d6fc67b219d72cfb51212115bf1e4a91";

const emptyDish: DishForm = {
  BIT240013_Name: "",
  BIT240013_Price: "",
  BIT240013_PreparationTime: "",
  BIT240013_IsAvailable: true,
  BIT240013_Description: "",
  BIT240013_DishCategoryId: "",
  BIT240013_DishImage: "[]",
  BIT240013_IsThumbnail: true,
};

const idOf = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const normalizeText = (value: unknown): string =>
  String(value ?? "").trim().toLocaleLowerCase();

const getEntityId = (entity: any): string => {
  if (!entity || typeof entity !== "object") return "";
  return String(
    entity.id ?? entity._id ?? entity.ID ?? entity.Id ?? entity.dishId ?? entity.categoryId ?? ""
  ).trim();
};

const isAvailable = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  const normalized = normalizeText(value);
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const isUsableImageUri = (value: string): boolean => {
  const url = value.trim();
  return (
    /^https?:\/\//i.test(url) ||
    /^file:\/\//i.test(url) ||
    /^content:\/\//i.test(url) ||
    /^ph:\/\//i.test(url) ||
    /^assets-library:\/\//i.test(url) ||
    url.startsWith("data:image/")
  );
};

const parseImages = (value: unknown): DishImage[] => {
  if (!value) return [];
  let parsed: unknown = value;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      return isUsableImageUri(raw) ? [{ url: raw, isThumbnail: true }] : [];
    }
  }

  if (typeof parsed === "string") {
    const url = parsed.trim();
    return isUsableImageUri(url) ? [{ url, isThumbnail: true }] : [];
  }

  if (!Array.isArray(parsed)) return [];
  const result: DishImage[] = [];

  parsed.forEach((item: unknown) => {
    if (typeof item === "string") {
      const url = item.trim();
      if (isUsableImageUri(url)) result.push({ url, isThumbnail: false });
      return;
    }
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const url = String(record.url ?? record.ImageUrl ?? record.imageUrl ?? record.uri ?? "").trim();
      if (isUsableImageUri(url)) {
        result.push({
          url,
          isThumbnail: record.isThumbnail === true || record.IsThumbnail === true,
        });
      }
    }
  });

  const thumbnails = result.filter((img) => img.isThumbnail);
  if (thumbnails.length > 1) {
    return result.map((img, idx) => ({
      ...img,
      isThumbnail: idx === 0,
    }));
  }

  if (result.length > 0 && !result.some((image) => image.isThumbnail)) {
    result[0].isThumbnail = true;
  }

  return result;
};

const serializeImages = (images: DishImage[]): string => {
  const unique: DishImage[] = [];
  images.forEach((image) => {
    const url = image.url.trim();
    if (isUsableImageUri(url) && !unique.some((existing) => existing.url === url)) {
      unique.push({ url, isThumbnail: image.isThumbnail });
    }
  });

  const coverIndex = unique.findIndex((image) => image.isThumbnail);
  const normalized = unique.map((image, index) => ({
    url: image.url,
    isThumbnail: coverIndex >= 0 ? index === coverIndex : index === 0,
  }));
  return JSON.stringify(normalized);
};

const getDishImages = (dish: Dish): DishImage[] => parseImages(dish.BIT240013_DishImage);

const getCoverImage = (dish: Dish): string => {
  const images = getDishImages(dish);
  const cover = images.find((image) => image.isThumbnail) ?? images[0];
  return cover?.url || DEFAULT_IMAGE;
};

const CATEGORY_CODE_MAP: Record<string, string> = {
  "category_main": "món chính",
  "category_starter": "món khai vị",
  "category_fast": "đồ ăn nhanh",
  "category_drink": "đồ uống",
  "category_dessert": "tráng miệng",
  "category_takeaway": "món chay",
};

const getCategoryName = (dish: Dish, categories: DishCategory[]): string => {
  const dishCatId = String(dish.BIT240013_DishCategoryId ?? "").trim().toLowerCase();
  if (!dishCatId) return "Uncategorized";

  const category = categories.find((item) => {
    const catId = getEntityId(item).toLowerCase();
    const catName = String(item.BIT240013_Name ?? "").trim().toLowerCase();
    if (catId === dishCatId) return true;
    if (catName === dishCatId) return true;
    if (catName && CATEGORY_CODE_MAP[dishCatId] === catName) return true;
    return false;
  });

  return category?.BIT240013_Name || "Uncategorized";
};

const matchesCategory = (dish: Dish, category: DishCategory): boolean => {
  const dishCatId = String(dish.BIT240013_DishCategoryId ?? "").trim().toLowerCase();
  if (!dishCatId) return false;

  const catId = getEntityId(category).toLowerCase();
  const catName = String(category.BIT240013_Name ?? "").trim().toLowerCase();

  if (catId && dishCatId === catId) return true;
  if (catName && dishCatId === catName) return true;
  if (catName && CATEGORY_CODE_MAP[dishCatId] === catName) return true;

  return false;
};

const getCategoryFilterKey = (category: DishCategory, index: number): string => {
  const cid = String(category.id ?? (category as any)._id ?? "").trim();
  if (cid) return cid;
  const name = String(category.BIT240013_Name ?? "").trim().toLowerCase();
  if (name) return `cat-name-${name}`;
  return `cat-index-${index}`;
};

const parsePriceInput = (value: string): number => {
  const cleaned = value.replace(/[.,\s]/g, "");
  return Number(cleaned) || 0;
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Không đọc được dữ liệu ảnh"));
    reader.readAsDataURL(blob);
  });

const uploadToImgBB = async (uri: string, base64FromPicker?: string | null): Promise<string> => {
  let base64 = (base64FromPicker || "").trim();

  if (!base64) {
    if (uri.startsWith("data:image/")) {
      base64 = uri.split(",")[1] || "";
    } else {
      const response = await fetch(uri);
      const blob = await response.blob();
      base64 = await blobToBase64(blob);
    }
  }

  if (!base64) throw new Error("Không đọc được dữ liệu ảnh");

  const body = new URLSearchParams();
  body.append("key", IMGBB_KEY);
  body.append("image", base64);

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    throw new Error(`ImgBB trả về dữ liệu không hợp lệ (HTTP ${res.status})`);
  }

  if (json?.success && json?.data?.url) return String(json.data.url);
  throw new Error(json?.error?.message || `Upload failed (HTTP ${res.status})`);
};

export default function App() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<DishCategory[]>([]);
  const [language, setLanguage] = useState<Language>("en");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [online, setOnline] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  
  // State cho Auto-Sync
  const [syncingOffline, setSyncingOffline] = useState(false);
  const isSyncingRef = useRef(false);

  const [tab, setTab] = useState<Tab>("dishes");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortType>("name");

  const [dishModal, setDishModal] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [dishForm, setDishForm] = useState<DishForm>(emptyDish);
  const [imageUrlInput, setImageUrlInput] = useState("");

  const [categoryModal, setCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DishCategory | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const [detailDish, setDetailDish] = useState<Dish | null>(null);
  const [detailModal, setDetailModal] = useState(false);
  const [detailImageIndex, setDetailImageIndex] = useState(0);

  const [deleteConfirm, setDeleteConfirm] = useState<{ visible: boolean; type: "dish" | "category" | null; id: string; name: string } | null>(null);

  const vi = language === "vi";

  const showToast = (message: string) => {
    if (Platform.OS === "web") {
      alert(message);
    } else {
      Alert.alert("Thông báo", message);
    }
  };

  const updateDishForm = (changes: Partial<DishForm>) => {
    setDishForm((previous) => ({ ...previous, ...changes }));
  };

  const currentFormImages = useMemo(
    () => parseImages(dishForm.BIT240013_DishImage),
    [dishForm.BIT240013_DishImage]
  );

  const filteredDishes = useMemo(() => {
    const keyword = normalizeText(search);
    const min = minPrice.trim() === "" ? null : parsePriceInput(minPrice);
    const max = maxPrice.trim() === "" ? null : parsePriceInput(maxPrice);

    if (
      (min !== null && min < 0) ||
      (max !== null && max < 0) ||
      (min !== null && max !== null && min > max)
    ) {
      return [];
    }

    const filtered = dishes.filter((dish) => {
      const nameMatches = normalizeText(dish.BIT240013_Name).includes(keyword);
      const categoryMatches =
        categoryFilter === "all" ||
        categories.some((category, index) => {
          const key = getCategoryFilterKey(category, index);
          if (key !== categoryFilter) return false;
          return matchesCategory(dish, category);
        });

      const available = isAvailable(dish.BIT240013_IsAvailable);
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "available" && available) ||
        (statusFilter === "unavailable" && !available);

      const price = Number(dish.BIT240013_Price);
      const minMatches = min === null || price >= min;
      const maxMatches = max === null || price <= max;

      return nameMatches && categoryMatches && statusMatches && minMatches && maxMatches;
    });

    filtered.sort((a, b) => {
      if (sort === "priceAsc") return Number(a.BIT240013_Price) - Number(b.BIT240013_Price);
      if (sort === "priceDesc") return Number(b.BIT240013_Price) - Number(a.BIT240013_Price);
      if (sort === "timeAsc") return Number(a.BIT240013_PreparationTime) - Number(b.BIT240013_PreparationTime);
      return String(a.BIT240013_Name ?? "").localeCompare(String(b.BIT240013_Name ?? ""), vi ? "vi" : "en");
    });

    return filtered;
  }, [dishes, categories, search, categoryFilter, statusFilter, minPrice, maxPrice, sort, vi]);

  const invalidPriceRange = minPrice.trim() !== "" && maxPrice.trim() !== "" && parsePriceInput(minPrice) > parsePriceInput(maxPrice);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected));
    });
    return unsubscribe;
  }, []);

  // TẢI DỮ LIỆU BAN ĐẦU: ƯU TIÊN DỮ LIỆU LOCAL, BẢO VỆ CÁC MÓN OFFLINE
  useEffect(() => {
    async function init() {
      setLoading(true);
      setFetchError(false);
      
      let localDishes: Dish[] = [];
      try {
        const storedDishes = await localStore.getDishes();
        const storedCategories = await localStore.getCategories();
        if (Array.isArray(storedDishes)) localDishes = storedDishes;
        if (Array.isArray(storedCategories)) setCategories(storedCategories);
        if (Array.isArray(storedDishes) && storedDishes.length > 0) setDishes(storedDishes);
      } catch (error) {
        console.warn("Cannot load local data:", error);
      }

      try {
        const network = await NetInfo.fetch();
        if (network.isConnected) {
          const [remoteDishes, remoteCategories] = await Promise.all([api.getDishes(), api.getCategories()]);
          if (Array.isArray(remoteDishes)) {
            // GIỮ LẠI CÁC MÓN CÓ ID BẮT ĐẦU BẰNG "local-" (Chưa đồng bộ)
            const offlineOnly = localDishes.filter(d => getEntityId(d).startsWith("local-"));
            // Gộp món offline vào danh sách món từ MockAPI
            const merged = [...offlineOnly, ...remoteDishes];
            
            setDishes(merged);
            await localStore.saveDishes(merged);
          }
          if (Array.isArray(remoteCategories)) {
            setCategories(remoteCategories);
            await localStore.saveCategories(remoteCategories);
          }
        }
      } catch (error) {
        console.warn("Cannot load remote data:", error);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // AUTO-SYNC: TỰ ĐỘNG ĐỒNG BỘ KHI CÓ MẠNG VÀ CÓ MÓN OFFLINE
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!online || isSyncingRef.current) return;
      
      const offlineDishes = dishes.filter(d => getEntityId(d).startsWith("local-"));
      if (offlineDishes.length === 0) return;

      isSyncingRef.current = true;
      setSyncingOffline(true);

      try {
        const nextDishes = [...dishes];
        let hasChanged = false;

        for (let i = 0; i < nextDishes.length; i++) {
          const dish = nextDishes[i];
          if (getEntityId(dish).startsWith("local-")) {
            try {
              const { id, ...dataToSend } = dish as any;
              const created = await api.createDish(dataToSend);
              if (created && getEntityId(created)) {
                nextDishes[i] = { ...created, id: getEntityId(created) };
                hasChanged = true;
              }
            } catch (e) {
              console.warn("Lỗi đồng bộ món:", dish.BIT240013_Name, e);
            }
          }
        }

        if (hasChanged) {
          await persistDishes(nextDishes);
          showToast(vi ? "Đã tự động đồng bộ món offline!" : "Offline dishes synced!");
        }
      } finally {
        isSyncingRef.current = false;
        setSyncingOffline(false);
      }
    }, 5000); // Cứ 5 giây kiểm tra một lần

    return () => clearInterval(interval);
  }, [online, dishes, vi]);

  async function persistDishes(next: Dish[]) {
    setDishes(next);
    try { await localStore.saveDishes(next); } catch (error) { console.warn(error); }
  }

  async function persistCategories(next: DishCategory[]) {
    setCategories(next);
    try { await localStore.saveCategories(next); } catch (error) { console.warn(error); }
  }

  async function syncNow() {
    if (!online) {
      showToast(vi ? "Lỗi: Không có mạng" : "Error: No internet");
      return;
    }
    setLoading(true);
    setFetchError(false);
    try {
      const [remoteDishes, remoteCategories] = await Promise.all([api.getDishes(), api.getCategories()]);
      if (!Array.isArray(remoteDishes) || !Array.isArray(remoteCategories)) throw new Error("Invalid API");
      
      const offlineOnly = dishes.filter(d => getEntityId(d).startsWith("local-"));
      const merged = [...offlineOnly, ...remoteDishes];
      
      await persistDishes(merged);
      await persistCategories(remoteCategories);
      showToast(vi ? "Đồng bộ thành công" : "Synced successfully");
    } catch (error) {
      setFetchError(true);
      showToast(vi ? "Lỗi đồng bộ" : "Sync error");
    } finally {
      setLoading(false);
    }
  }

  function openAddDish() {
    setEditingDish(null);
    const first = categories[0];
    setDishForm({
      ...emptyDish,
      BIT240013_DishCategoryId: first ? getEntityId(first) || getCategoryFilterKey(first, 0) : "",
    });
    setImageUrlInput("");
    setDishModal(true);
  }

  function openEditDish(dish: Dish) {
    const categoryId = idOf(dish.BIT240013_DishCategoryId);
    const matchingCategory = categories.find((category) => matchesCategory(dish, category));
    setEditingDish(dish);
    setDishForm({
      BIT240013_Name: String(dish.BIT240013_Name ?? ""),
      BIT240013_Price: String(dish.BIT240013_Price ?? ""),
      BIT240013_PreparationTime: String(dish.BIT240013_PreparationTime ?? ""),
      BIT240013_IsAvailable: isAvailable(dish.BIT240013_IsAvailable),
      BIT240013_Description: String(dish.BIT240013_Description ?? ""),
      BIT240013_DishCategoryId: getEntityId(matchingCategory) || categoryId,
      BIT240013_DishImage: serializeImages(getDishImages(dish)),
      BIT240013_IsThumbnail: dish.BIT240013_IsThumbnail !== false,
    });
    setImageUrlInput("");
    setDishModal(true);
  }

  function addImageByUrl() {
    const url = imageUrlInput.trim();
    if (!url) return showToast(vi ? "Nhập URL trước" : "Enter URL first");
    if (!isUsableImageUri(url)) return showToast(vi ? "URL ảnh không hợp lệ" : "Invalid image URL");
    if (currentFormImages.some((img) => img.url === url)) return showToast(vi ? "Ảnh đã tồn tại" : "Image exists");
    if (currentFormImages.length >= MAX_IMAGES) {
      return showToast(vi ? `Tối đa ${MAX_IMAGES} ảnh mỗi món` : `Maximum ${MAX_IMAGES} images per dish`);
    }

    const nextImages = [...currentFormImages, { url, isThumbnail: currentFormImages.length === 0 }];
    updateDishForm({ BIT240013_DishImage: serializeImages(nextImages) });
    setImageUrlInput("");
    showToast(vi ? "Đã thêm ảnh thành công!" : "Image added!");
  }

  async function chooseImages() {
    if (uploadingImage) return;

    const remainingSlots = MAX_IMAGES - currentFormImages.length;
    if (remainingSlots <= 0) {
      return showToast(vi ? `Tối đa ${MAX_IMAGES} ảnh mỗi món` : `Maximum ${MAX_IMAGES} images per dish`);
    }

    try {
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return showToast(vi ? "Cần quyền truy cập ảnh" : "Need photo permission");
      }

      const mediaTypes: any = (ImagePicker as any).MediaTypeOptions?.Images ?? ["images"];
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;

      setUploadingImage(true);

      const assets = result.assets.slice(0, remainingSlots);
      const uploadedUrls: string[] = [];
      let lastError = "";

      for (const asset of assets) {
        if (!asset.uri) continue;
        try {
          const httpsUrl = await uploadToImgBB(asset.uri, asset.base64);
          uploadedUrls.push(httpsUrl);
        } catch (e: any) {
          lastError = e?.message || String(e);
          console.warn("Lỗi upload 1 ảnh:", e);
        }
      }

      if (uploadedUrls.length > 0) {
        const nextImages = [...currentFormImages];
        uploadedUrls.forEach((url) => {
          if (!nextImages.some((img) => img.url === url)) {
            nextImages.push({ url, isThumbnail: false });
          }
        });
        if (nextImages.length > 0 && !nextImages.some((img) => img.isThumbnail)) {
          nextImages[0].isThumbnail = true;
        }
        updateDishForm({ BIT240013_DishImage: serializeImages(nextImages) });

        if (lastError) {
          showToast(
            vi
              ? `Đã thêm ${uploadedUrls.length}/${assets.length} ảnh. Lỗi: ${lastError}`
              : `Added ${uploadedUrls.length}/${assets.length} images. Error: ${lastError}`
          );
        } else {
          showToast(vi ? "Đã thêm ảnh mới thành công!" : "Added new images!");
        }
      } else {
        showToast((vi ? "Tải ảnh thất bại: " : "Upload failed: ") + (lastError || (vi ? "Không xác định" : "Unknown")));
      }
    } catch (error: any) {
      showToast((vi ? "Lỗi chọn ảnh: " : "Image selection error: ") + (error?.message || ""));
    } finally {
      setUploadingImage(false);
    }
  }

  function setCoverImage(url: string) {
    const nextImages = currentFormImages.map((image) => ({ ...image, isThumbnail: image.url === url }));
    updateDishForm({ BIT240013_DishImage: serializeImages(nextImages) });
  }

  function removeImage(url: string) {
    const nextImages = currentFormImages.filter((image) => image.url !== url);
    if (nextImages.length > 0 && !nextImages.some((image) => image.isThumbnail)) nextImages[0].isThumbnail = true;
    updateDishForm({ BIT240013_DishImage: serializeImages(nextImages) });
  }

  async function saveDish() {
    const name = dishForm.BIT240013_Name.trim();
    const priceText = dishForm.BIT240013_Price.trim();
    const timeText = dishForm.BIT240013_PreparationTime.trim();
    const description = dishForm.BIT240013_Description.trim();
    const price = parsePriceInput(priceText);
    const preparationTime = Number(timeText);
    const categoryId = idOf(dishForm.BIT240013_DishCategoryId);

    if (!name) return showToast(vi ? "Nhập tên món" : "Enter dish name");
    if (priceText === "" || price < 0) return showToast(vi ? "Giá không hợp lệ" : "Invalid price");
    if (timeText === "" || Number.isNaN(preparationTime) || preparationTime < 0) return showToast(vi ? "Thời gian không hợp lệ" : "Invalid time");
    if (!categories.find((c, i) => getCategoryFilterKey(c, i) === categoryId || getEntityId(c) === categoryId)) return showToast(vi ? "Chọn danh mục" : "Choose category");
    if (uploadingImage) return showToast(vi ? "Ảnh đang được tải lên, vui lòng đợi" : "Image is uploading, please wait");

    const data: Omit<Dish, "id"> = {
      BIT240013_Name: name,
      BIT240013_Price: price,
      BIT240013_PreparationTime: preparationTime,
      BIT240013_IsAvailable: dishForm.BIT240013_IsAvailable,
      BIT240013_Description: description,
      BIT240013_DishCategoryId: categoryId,
      BIT240013_DishImage: serializeImages(currentFormImages),
      BIT240013_IsThumbnail: true,
    };

    setSaving(true);
    try {
      if (editingDish) {
        const editingId = getEntityId(editingDish);
        const existing = dishes.find((dish) => getEntityId(dish) === editingId);
        if (!existing) throw new Error("Dish not found");

        const updatedLocal: Dish = { ...existing, ...data, id: editingId };

        if (online && !editingId.startsWith("local-")) {
          const response = await api.updateDish(editingId, data);
          if (response && getEntityId(response)) {
            await persistDishes(dishes.map((d) => getEntityId(d) === editingId ? { ...response, id: getEntityId(response) } : d));
          } else {
            await persistDishes(dishes.map((d) => getEntityId(d) === editingId ? updatedLocal : d));
          }
        } else {
          // Offline edit
          await persistDishes(dishes.map((d) => getEntityId(d) === editingId ? updatedLocal : d));
        }
      } else {
        if (online) {
          const created = await api.createDish(data);
          if (!created || !getEntityId(created)) throw new Error("Invalid created ID");
          await persistDishes([...dishes, created]);
        } else {
          // Offline create
          await persistDishes([...dishes, { ...data, id: `local-${Date.now()}` } as Dish]);
        }
      }
      setDishModal(false);
      setEditingDish(null);
      setDishForm(emptyDish);
      showToast(online ? (vi ? "Đã lưu món ăn" : "Dish saved") : (vi ? "Đã lưu offline. Tự động đồng bộ khi có mạng!" : "Saved offline. Auto-sync when online!"));
    } catch (error: any) {
      console.warn("saveDish error:", error);
      showToast(vi ? `Lỗi: ${error?.message || "Không xác định"}` : `Error: ${error?.message || "Unknown"}`);
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteDish(dish: Dish) {
    setDeleteConfirm({
      visible: true,
      type: "dish",
      id: getEntityId(dish),
      name: dish.BIT240013_Name || "",
    });
  }

  async function deleteDish(dish: Dish) {
    const id = getEntityId(dish);
    if (!id) return;

    const nextDishes = dishes.filter((item) => getEntityId(item) !== id);
    await persistDishes(nextDishes);

    if (detailDish && getEntityId(detailDish) === id) {
      setDetailModal(false);
      setDetailDish(null);
    }

    showToast(vi ? "Đã xóa món ăn" : "Dish deleted");

    if (online && !id.startsWith("local-")) {
      try { await api.deleteDish(id); } catch (err) { console.warn("Lỗi server", err); }
    }
  }

  function openAddCategory() {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setCategoryModal(true);
  }

  function openEditCategory(category: DishCategory) {
    setEditingCategory(category);
    setCategoryName(category.BIT240013_Name ?? "");
    setCategoryDescription(category.BIT240013_Description ?? "");
    setCategoryModal(true);
  }

  async function saveCategory() {
    const name = categoryName.trim();
    if (!name) return showToast(vi ? "Nhập tên danh mục" : "Enter category name");

    const editingId = getEntityId(editingCategory);
    const duplicate = categories.some((c) => normalizeText(c.BIT240013_Name) === normalizeText(name) && getEntityId(c) !== editingId);
    if (duplicate) return showToast(vi ? "Danh mục đã tồn tại" : "Category exists");

    const data = { BIT240013_Name: name, BIT240013_Description: categoryDescription.trim() };

    try {
      if (editingCategory) {
        const existing = categories.find((c) => getEntityId(c) === editingId);
        if (!existing) throw new Error("Category not found");

        if (online && !editingId.startsWith("local-")) {
          const response = await api.updateCategory(editingId, data);
          await persistCategories(categories.map((c) => getEntityId(c) === editingId ? { ...existing, ...data, ...(response ?? {}) } : c));
        } else {
          await persistCategories(categories.map((c) => getEntityId(c) === editingId ? { ...existing, ...data } : c));
        }
      } else {
        if (online) {
          const created = await api.createCategory(data);
          if (!created || !getEntityId(created)) throw new Error("Invalid ID");
          await persistCategories([...categories, created]);
        } else {
          await persistCategories([...categories, { ...data, id: `local-${Date.now()}` } as DishCategory]);
        }
      }
      setCategoryModal(false);
      setEditingCategory(null);
      showToast(vi ? "Đã lưu danh mục" : "Category saved");
    } catch (error: any) {
      console.warn("saveCategory error:", error);
      showToast(vi ? `Lỗi khi lưu: ${error?.message || ""}` : `Error saving: ${error?.message || ""}`);
    }
  }

  function confirmDeleteCategory(category: DishCategory) {
    const inUse = dishes.some((dish) => matchesCategory(dish, category));
    if (inUse) return showToast(vi ? "Danh mục đang có món ăn, không thể xóa" : "Category is in use, cannot delete");

    setDeleteConfirm({
      visible: true,
      type: "category",
      id: getEntityId(category),
      name: category.BIT240013_Name || "",
    });
  }

  async function deleteCategory(category: DishCategory) {
    const id = getEntityId(category);
    if (!id) return;

    await persistCategories(categories.filter((c) => getEntityId(c) !== id));
    if (categoryFilter === id) setCategoryFilter("all");
    showToast(vi ? "Đã xóa danh mục" : "Category deleted");

    if (online && !id.startsWith("local-")) {
      try { await api.deleteCategory(id); } catch (err) { console.warn(err); }
    }
  }

  function openDishDetails(dish: Dish) {
    setDetailDish(dish);
    setDetailImageIndex(0);
    setDetailModal(true);
  }

  const detailImages = detailDish ? getDishImages(detailDish) : [];
  const detailCover = detailImages.find((img) => img.isThumbnail) ?? detailImages[0];
  const currentDetailImage = detailImages[detailImageIndex] ?? detailCover;

  function clearFilters() {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setSort("name");
  }

  const chip = (key: string, label: string, selected: boolean, onPress: () => void) => (
    <Pressable key={key} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );

  const renderDish = (dish: Dish) => {
    const available = isAvailable(dish.BIT240013_IsAvailable);
    const time = Number(dish.BIT240013_PreparationTime);
    const quick = time <= 15;
    const key = getEntityId(dish) || `dish-${dish.BIT240013_Name}`;
    const coverUrl = getCoverImage(dish);
    const isOffline = getEntityId(dish).startsWith("local-");

    return (
      <View key={key} style={styles.dishCardRow}>
        <Pressable onPress={() => openDishDetails(dish)} style={styles.imageContainerRow}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.dishImageRow} resizeMode="cover" />
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageText}>{vi ? "Không ảnh" : "No Image"}</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.dishContentRow}>
          <View style={styles.titleRow}>
            <Text style={styles.dishNameRow} numberOfLines={1}>
              {dish.BIT240013_Name || (vi ? "Chưa có tên" : "Unnamed")}
            </Text>
            {isOffline && (
              <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4 }}>
                <Text style={{ fontSize: 10, color: "#B45309", fontWeight: "700" }}>OFFLINE</Text>
              </View>
            )}
            <View style={[styles.timeBadge, quick ? styles.quickBadge : styles.regularBadge]}>
              <Text style={[styles.timeBadgeText, !quick && { color: "#e65100" }]}>
                {quick ? (vi ? "Nhanh" : "Quick") : (vi ? "Thường" : "Regular")}
              </Text>
            </View>
          </View>

          <Text style={styles.dishPriceRow}>
            {Number(dish.BIT240013_Price || 0).toLocaleString("vi-VN")} VND
          </Text>

          <View style={styles.metaRowRow}>
            <Text style={styles.metaTextRow}>
              {time} {vi ? "phút" : "min"} • {available ? (vi ? "Đang bán" : "Available") : (vi ? "Ngừng bán" : "Unavailable")}
            </Text>
          </View>

          {!!dish.BIT240013_Description && (
            <Text style={styles.descriptionRow} numberOfLines={2}>
              {dish.BIT240013_Description}
            </Text>
          )}

          <View style={styles.actionRowBottom}>
            <Pressable style={[styles.actionButtonRow, styles.editButtonRow]} onPress={() => openEditDish(dish)}>
              <Text style={styles.actionButtonTextRow}>✎ {vi ? "Sửa" : "Edit"}</Text>
            </Pressable>
            <Pressable style={[styles.actionButtonRow, styles.deleteButtonRow]} onPress={() => confirmDeleteDish(dish)}>
              <Text style={styles.actionButtonTextRow}>✖ {vi ? "Xóa" : "Delete"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderCategory = (category: DishCategory, index: number) => {
    const id = getEntityId(category) || `cat-${index}`;
    const count = dishes.filter((dish) => matchesCategory(dish, category)).length;

    return (
      <View key={id} style={styles.categoryCard}>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>
            {category.BIT240013_Name || (vi ? "Chưa có tên" : "Unnamed")}
          </Text>
          <Text style={styles.secondaryText}>
            {count} {vi ? "món ăn" : "dishes"}
          </Text>
          {!!category.BIT240013_Description && (
            <Text style={styles.description} numberOfLines={2}>{category.BIT240013_Description}</Text>
          )}
        </View>

        <View style={styles.categoryActions}>
          <Pressable style={[styles.smallButton, styles.editButton]} onPress={() => openEditCategory(category)}>
            <Text style={[styles.smallButtonText, { color: "#F57C00" }]}>{vi ? "Sửa" : "Edit"}</Text>
          </Pressable>
          <Pressable style={[styles.smallButton, styles.deleteButton]} onPress={() => confirmDeleteCategory(category)}>
            <Text style={[styles.smallButtonText, { color: "#D32F2F" }]}>{vi ? "Xóa" : "Delete"}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "dish") {
      const dishToDelete = dishes.find((d) => getEntityId(d) === deleteConfirm.id);
      if (dishToDelete) deleteDish(dishToDelete);
    } else if (deleteConfirm.type === "category") {
      const categoryToDelete = categories.find((c) => getEntityId(c) === deleteConfirm.id);
      if (categoryToDelete) deleteCategory(categoryToDelete);
    }
    setDeleteConfirm(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{vi ? "Quản lý Nhà hàng" : "Restaurant Manager"}</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.langButton} onPress={() => setLanguage(vi ? "en" : "vi")}>
            <Text style={styles.langButtonText}>{vi ? "EN" : "VI"}</Text>
          </Pressable>
          <Pressable style={[styles.syncButton, !online && styles.offlineSyncButton]} onPress={syncNow}>
            <Text style={styles.syncButtonText}>
              {syncingOffline ? (vi ? "Đang đồng bộ..." : "Syncing...") : online ? (vi ? "Đồng bộ" : "Sync") : (vi ? "Ngoại tuyến" : "Offline")}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabRow}>
        <Pressable style={[styles.tabButton, tab === "dishes" && styles.tabButtonActive]} onPress={() => setTab("dishes")}>
          <Text style={[styles.tabButtonText, tab === "dishes" && styles.tabButtonTextActive]}>
            {vi ? `Món ăn (${dishes.length})` : `Dishes (${dishes.length})`}
          </Text>
        </Pressable>
        <Pressable style={[styles.tabButton, tab === "categories" && styles.tabButtonActive]} onPress={() => setTab("categories")}>
          <Text style={[styles.tabButtonText, tab === "categories" && styles.tabButtonTextActive]}>
            {vi ? `Danh mục (${categories.length})` : `Categories (${categories.length})`}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{vi ? "Đang tải..." : "Loading..."}</Text>
        </View>
      ) : fetchError && dishes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={{ fontSize: 16, color: "#EF4444", marginBottom: 16 }}>
            {vi ? "Không thể kết nối đến MockAPI!" : "Cannot connect to MockAPI!"}
          </Text>
          <Pressable style={styles.syncButton} onPress={syncNow}>
            <Text style={styles.syncButtonText}>{vi ? "Thử lại" : "Retry"}</Text>
          </Pressable>
        </View>
      ) : tab === "dishes" ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.filterCard}>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder={vi ? "Tìm kiếm món ăn..." : "Search dishes..."}
                placeholderTextColor="#999"
                value={search}
                onChangeText={setSearch}
              />
              {!!search && (
                <Pressable style={styles.clearSearchButton} onPress={() => setSearch("")}>
                  <Text style={styles.clearSearchText}>✕</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.filterLabel}>{vi ? "Danh mục:" : "Category:"}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {chip("cat-all", vi ? "Tất cả" : "All", categoryFilter === "all", () => setCategoryFilter("all"))}
              {categories.map((cat, index) => {
                const filterKey = getCategoryFilterKey(cat, index);
                const isSelected = categoryFilter === filterKey;
                return chip(`cat-${filterKey}-${index}`, cat.BIT240013_Name || `#${index + 1}`, isSelected, () => setCategoryFilter(isSelected ? "all" : filterKey));
              })}
            </ScrollView>

            <Text style={styles.filterLabel}>{vi ? "Trạng thái:" : "Status:"}</Text>
            <View style={styles.chipsRow}>
              {chip("status-all", vi ? "Tất cả" : "All", statusFilter === "all", () => setStatusFilter("all"))}
              {chip("status-available", vi ? "Đang bán" : "Available", statusFilter === "available", () => setStatusFilter("available"))}
              {chip("status-unavailable", vi ? "Ngừng bán" : "Unavailable", statusFilter === "unavailable", () => setStatusFilter("unavailable"))}
            </View>

            <Text style={styles.filterLabel}>{vi ? "Lọc theo giá (VNĐ):" : "Filter by price:"}</Text>
            <View style={styles.priceFilterRow}>
              <TextInput
                style={[styles.priceInput, invalidPriceRange && styles.inputError]}
                placeholder={vi ? "Từ giá..." : "Min..."}
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
              />
              <Text style={styles.priceDash}>-</Text>
              <TextInput
                style={[styles.priceInput, invalidPriceRange && styles.inputError]}
                placeholder={vi ? "Đến giá..." : "Max..."}
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
              />
            </View>
            {invalidPriceRange && (
              <Text style={{ color: "#EF4444", fontSize: 12, marginBottom: 8 }}>
                {vi ? "Khoảng giá không hợp lệ (Min > Max)" : "Invalid price range (Min > Max)"}
              </Text>
            )}

            <Text style={styles.filterLabel}>{vi ? "Sắp xếp:" : "Sort by:"}</Text>
            <View style={styles.chipsRow}>
              {chip("sort-name", vi ? "Tên A-Z" : "Name A-Z", sort === "name", () => setSort("name"))}
              {chip("sort-priceAsc", vi ? "Giá tăng" : "Price Asc", sort === "priceAsc", () => setSort("priceAsc"))}
              {chip("sort-priceDesc", vi ? "Giá giảm" : "Price Desc", sort === "priceDesc", () => setSort("priceDesc"))}
              {chip("sort-timeAsc", vi ? "Thời gian tăng" : "Time Asc", sort === "timeAsc", () => setSort("timeAsc"))}
            </View>

            <View style={styles.filterActionsRow}>
              <Pressable style={styles.addButton} onPress={openAddDish}>
                <Text style={styles.addButtonText}>{vi ? "+ Thêm món ăn" : "+ Add Dish"}</Text>
              </Pressable>
              <Pressable style={styles.resetFiltersButton} onPress={clearFilters}>
                <Text style={styles.resetFiltersButtonText}>{vi ? "Xóa lọc" : "Reset"}</Text>
              </Pressable>
            </View>
          </View>

          {filteredDishes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{vi ? "Không tìm thấy món ăn nào." : "No dishes found."}</Text>
            </View>
          ) : (
            filteredDishes.map(renderDish)
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.filterCard}>
            <Pressable style={styles.addButton} onPress={openAddCategory}>
              <Text style={styles.addButtonText}>{vi ? "+ Thêm danh mục" : "+ Add Category"}</Text>
            </Pressable>
          </View>

          {categories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{vi ? "Chưa có danh mục nào." : "No categories."}</Text>
            </View>
          ) : (
            categories.map((c, i) => renderCategory(c, i))
          )}
        </ScrollView>
      )}

      <Modal visible={!!deleteConfirm?.visible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>{vi ? "Xác nhận xóa" : "Confirm Deletion"}</Text>
            <Text style={styles.alertMessage}>
              {vi ? `Bạn có chắc chắn muốn xóa "${deleteConfirm?.name}" không? Hành động này không thể hoàn tác.` : `Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
            </Text>
            <View style={styles.alertButtonsRow}>
              <Pressable style={[styles.alertButton, styles.alertCancelBtn]} onPress={() => setDeleteConfirm(null)}>
                <Text style={styles.alertCancelText}>{vi ? "Hủy" : "Cancel"}</Text>
              </Pressable>
              <Pressable style={[styles.alertButton, styles.alertDeleteBtn]} onPress={handleConfirmDelete}>
                <Text style={styles.alertDeleteText}>{vi ? "Xóa" : "Delete"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={detailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentDetail}>
            {detailDish && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {currentDetailImage ? (
                  <View style={styles.imageWrapperDetail}>
                    <Image source={{ uri: currentDetailImage.url }} style={styles.detailCoverImageFull} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={[styles.imageWrapperDetail, { justifyContent: "center", alignItems: "center" }]}>
                    <Text style={{ color: "#999", fontSize: 16 }}>{vi ? "Không có ảnh" : "No Image"}</Text>
                  </View>
                )}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detailThumbsRow}>
                  {detailImages.map((img, idx) => (
                    <Pressable key={`${img.url}-${idx}`} onPress={() => setDetailImageIndex(idx)}>
                      <Image
                        source={{ uri: img.url }}
                        style={[styles.detailThumbImage, detailImageIndex === idx && styles.detailThumbSelected]}
                      />
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={{ padding: 20 }}>
                  <Text style={styles.detailTitle}>{detailDish.BIT240013_Name}</Text>
                  <Text style={styles.detailPrice}>
                    {Number(detailDish.BIT240013_Price || 0).toLocaleString("vi-VN")} đ
                  </Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{vi ? "Danh mục:" : "Category:"}</Text>
                    <Text style={styles.detailValue}>{getCategoryName(detailDish, categories)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{vi ? "Thời gian:" : "Prep time:"}</Text>
                    <Text style={styles.detailValue}>{detailDish.BIT240013_PreparationTime} {vi ? "phút" : "mins"}</Text>
                  </View>
                  {!!detailDish.BIT240013_Description && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.detailLabel}>{vi ? "Mô tả:" : "Description:"}</Text>
                      <Text style={styles.detailDescription}>{detailDish.BIT240013_Description}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <Pressable
              style={[styles.modalButton, styles.saveModalButton, { marginHorizontal: 20, marginBottom: 20 }]}
              onPress={() => setDetailModal(false)}
            >
              <Text style={styles.saveModalButtonText}>{vi ? "Đóng" : "Close"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={dishModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingDish ? (vi ? "Sửa món ăn" : "Edit Dish") : (vi ? "Thêm món ăn" : "New Dish")}
            </Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{vi ? "Tên món ăn *" : "Name *"}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={vi ? "Nhập tên món" : "Enter name"}
                placeholderTextColor="#999"
                value={dishForm.BIT240013_Name}
                onChangeText={(text) => updateDishForm({ BIT240013_Name: text })}
              />

              <Text style={styles.inputLabel}>{vi ? "Giá (VNĐ) *" : "Price *"}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={vi ? "Nhập giá" : "Enter price"}
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={dishForm.BIT240013_Price}
                onChangeText={(text) => updateDishForm({ BIT240013_Price: text })}
              />

              <Text style={styles.inputLabel}>{vi ? "Thời gian (phút) *" : "Time (min) *"}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={vi ? "Ví dụ: 15" : "e.g. 15"}
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={dishForm.BIT240013_PreparationTime}
                onChangeText={(text) => updateDishForm({ BIT240013_PreparationTime: text })}
              />

              <Text style={styles.inputLabel}>{vi ? "Danh mục *" : "Category *"}</Text>
              <View style={styles.categoriesGrid}>
                {categories.map((cat, index) => {
                  const key = getCategoryFilterKey(cat, index);
                  const entityId = getEntityId(cat);
                  const isSelected = dishForm.BIT240013_DishCategoryId === key || dishForm.BIT240013_DishCategoryId === entityId;
                  return (
                    <Pressable
                      key={`select-${key}-${index}`}
                      style={[styles.categorySelectItem, isSelected && styles.categorySelectItemSelected]}
                      onPress={() => updateDishForm({ BIT240013_DishCategoryId: entityId || key })}
                    >
                      <Text style={[styles.categorySelectText, isSelected && styles.categorySelectTextSelected]}>
                        {cat.BIT240013_Name || `#${index + 1}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>{vi ? "Mô tả" : "Description"}</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder={vi ? "Nhập mô tả..." : "Enter description..."}
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                value={dishForm.BIT240013_Description}
                onChangeText={(text) => updateDishForm({ BIT240013_Description: text })}
              />

              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>{vi ? "Trạng thái đang bán" : "Is Available"}</Text>
                <Switch
                  value={dishForm.BIT240013_IsAvailable}
                  onValueChange={(val) => updateDishForm({ BIT240013_IsAvailable: val })}
                  trackColor={{ false: "#ddd", true: "#34C759" }}
                />
              </View>

              <Text style={styles.inputLabel}>
                {vi ? `Hình ảnh (${currentFormImages.length}/${MAX_IMAGES})` : `Images (${currentFormImages.length}/${MAX_IMAGES})`}
              </Text>

              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <Pressable
                  style={[styles.pickImageButton, { flex: 1, marginBottom: 0 }, uploadingImage && { opacity: 0.6 }]}
                  onPress={chooseImages}
                  disabled={saving || uploadingImage}
                >
                  <Text style={styles.pickImageButtonText}>
                    {uploadingImage ? (vi ? "Đang tải ảnh lên..." : "Uploading...") : (vi ? "Chọn ảnh từ thiết bị" : "Pick from device")}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.imageInputRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                  placeholder={vi ? "Hoặc dán URL ảnh..." : "Or paste image URL..."}
                  placeholderTextColor="#999"
                  value={imageUrlInput}
                  onChangeText={setImageUrlInput}
                />
                <Pressable style={styles.addImageUrlButton} onPress={addImageByUrl} disabled={saving || uploadingImage}>
                  {uploadingImage ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addImageUrlButtonText}>{vi ? "Thêm" : "Add"}</Text>}
                </Pressable>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewImagesRow}>
                {currentFormImages.map((img) => (
                  <View key={img.url} style={styles.previewContainer}>
                    <Image source={{ uri: img.url }} style={styles.previewImage} />
                    {img.isThumbnail && (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>{vi ? "Ảnh bìa" : "Cover"}</Text>
                      </View>
                    )}
                    <View style={styles.previewActions}>
                      {!img.isThumbnail && (
                        <Pressable style={styles.previewActionBtn} onPress={() => setCoverImage(img.url)}>
                          <Text style={styles.previewActionText}>{vi ? "Đặt bìa" : "Set"}</Text>
                        </Pressable>
                      )}
                      <Pressable style={[styles.previewActionBtn, styles.deleteBtnBg]} onPress={() => removeImage(img.url)}>
                        <Text style={styles.previewActionText}>✕</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <Pressable style={[styles.modalButton, styles.cancelModalButton]} onPress={() => setDishModal(false)}>
                <Text style={styles.cancelModalButtonText}>{vi ? "Hủy" : "Cancel"}</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.saveModalButton]} onPress={saveDish} disabled={saving || uploadingImage}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveModalButtonText}>{vi ? "Lưu" : "Save"}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={categoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCategory ? (vi ? "Sửa danh mục" : "Edit Category") : (vi ? "Thêm danh mục" : "New Category")}
            </Text>

            <Text style={styles.inputLabel}>{vi ? "Tên danh mục *" : "Name *"}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={vi ? "Nhập tên danh mục" : "Enter name"}
              placeholderTextColor="#999"
              value={categoryName}
              onChangeText={setCategoryName}
            />

            <Text style={styles.inputLabel}>{vi ? "Mô tả" : "Description"}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder={vi ? "Nhập mô tả..." : "Enter description..."}
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              value={categoryDescription}
              onChangeText={setCategoryDescription}
            />

            <View style={styles.modalButtonsRow}>
              <Pressable style={[styles.modalButton, styles.cancelModalButton]} onPress={() => setCategoryModal(false)}>
                <Text style={styles.cancelModalButtonText}>{vi ? "Hủy" : "Cancel"}</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.saveModalButton]} onPress={saveCategory}>
                <Text style={styles.saveModalButtonText}>{vi ? "Lưu" : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertBox: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  alertTitle: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 12, textAlign: "center" },
  alertMessage: { fontSize: 15, color: "#4B5563", textAlign: "center", marginBottom: 24, lineHeight: 22 },
  alertButtonsRow: { flexDirection: "row", gap: 12 },
  alertButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  alertCancelBtn: { backgroundColor: "#F3F4F6" },
  alertCancelText: { color: "#4B5563", fontWeight: "700", fontSize: 15 },
  alertDeleteBtn: { backgroundColor: "#EF4444" },
  alertDeleteText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  langButtonText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  syncButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  offlineSyncButton: { backgroundColor: "#F59E0B" },
  syncButtonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabButtonActive: { borderBottomWidth: 3, borderBottomColor: "#3B82F6" },
  tabButtonText: { fontSize: 15, color: "#6B7280", fontWeight: "600" },
  tabButtonTextActive: { color: "#3B82F6", fontWeight: "700" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6B7280", fontWeight: "500" },
  content: { flex: 1, padding: 16 },
  filterCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
    fontSize: 14,
  },
  clearSearchButton: { padding: 10 },
  clearSearchText: { fontSize: 16, color: "#9CA3AF" },
  filterLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipsRow: { flexDirection: "row", marginBottom: 12 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  chipSelected: { backgroundColor: "#3B82F6" },
  chipText: { fontSize: 13, color: "#4B5563", fontWeight: "500" },
  chipTextSelected: { color: "#fff", fontWeight: "700" },
  priceFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  priceInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    fontSize: 14,
  },
  inputError: { borderColor: "#EF4444" },
  priceDash: { marginHorizontal: 12, color: "#9CA3AF", fontWeight: "bold" },
  filterActionsRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  addButton: {
    flex: 2,
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  resetFiltersButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  resetFiltersButtonText: { color: "#4B5563", fontWeight: "700", fontSize: 14 },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { color: "#6B7280", fontSize: 15, fontWeight: "500" },
  dishCardRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 140,
  },
  imageContainerRow: {
    width: 140,
    height: "100%",
    backgroundColor: "#F3F4F6",
  },
  dishImageRow: {
    width: "100%",
    height: "100%",
  },
  noImageContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
  },
  noImageText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  dishContentRow: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dishNameRow: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  dishPriceRow: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3B82F6",
    marginTop: 4,
    marginBottom: 4,
  },
  metaRowRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metaTextRow: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  descriptionRow: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 12,
  },
  timeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  quickBadge: { backgroundColor: "#F0FDF4" },
  regularBadge: { backgroundColor: "#FFF7ED" },
  timeBadgeText: { fontSize: 12, color: "#16A34A", fontWeight: "600" },
  actionRowBottom: {
    flexDirection: "row",
    gap: 8,
  },
  actionButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  editButtonRow: {
    backgroundColor: "#3B82F6",
  },
  deleteButtonRow: {
    backgroundColor: "#EF4444",
  },
  actionButtonTextRow: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryInfo: { flex: 1, marginRight: 16 },
  categoryName: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 4 },
  secondaryText: { fontSize: 14, color: "#6B7280", marginBottom: 4 },
  categoryActions: { flexDirection: "row", gap: 8 },
  smallButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  smallButtonText: { fontSize: 12, fontWeight: "700" },
  editButton: { backgroundColor: "#FFF7ED" },
  deleteButton: { backgroundColor: "#FEF2F2" },
  description: { fontSize: 14, color: "#4B5563", lineHeight: 20, marginTop: 4, marginBottom: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContentDetail: {
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  imageWrapperDetail: {
    width: "100%",
    height: 300,
    backgroundColor: "#F3F4F6",
  },
  detailCoverImageFull: {
    width: "100%",
    height: "100%",
  },
  detailThumbsRow: { flexDirection: "row", padding: 16, backgroundColor: "#fff" },
  detailThumbImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  detailThumbSelected: { borderColor: "#3B82F6" },
  detailTitle: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 8 },
  detailPrice: { fontSize: 20, fontWeight: "800", color: "#EF4444", marginBottom: 16 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  detailLabel: { fontSize: 15, color: "#6B7280", fontWeight: "500" },
  detailValue: { fontSize: 15, color: "#111827", fontWeight: "600" },
  detailDescription: { fontSize: 15, color: "#4B5563", lineHeight: 22 },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  modalScroll: { maxHeight: 400 },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: "#F9FAFB",
    marginBottom: 12,
    fontSize: 15,
    color: "#111827",
  },
  textArea: { height: 100, textAlignVertical: "top", paddingTop: 12 },
  categoriesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  categorySelectItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
  },
  categorySelectItemSelected: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  categorySelectText: { fontSize: 14, color: "#4B5563", fontWeight: "500" },
  categorySelectTextSelected: { color: "#3B82F6", fontWeight: "700" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imageInputRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  addImageUrlButton: {
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 10,
    height: 46,
  },
  addImageUrlButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  pickImageButton: {
    backgroundColor: "#6B7280",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  pickImageButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  previewImagesRow: { flexDirection: "row", marginBottom: 12 },
  previewContainer: {
    width: 90,
    height: 90,
    marginRight: 10,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  previewImage: { width: "100%", height: "100%" },
  coverBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(59, 130, 246, 0.9)",
    alignItems: "center",
    paddingVertical: 2,
  },
  coverBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  previewActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  previewActionBtn: { flex: 1, alignItems: "center", paddingVertical: 4 },
  deleteBtnBg: { backgroundColor: "rgba(239, 68, 68, 0.8)" },
  previewActionText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  modalButtonsRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelModalButton: { backgroundColor: "#F3F4F6" },
  cancelModalButtonText: { color: "#4B5563", fontWeight: "700", fontSize: 15 },
  saveModalButton: { backgroundColor: "#3B82F6" },
  saveModalButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});