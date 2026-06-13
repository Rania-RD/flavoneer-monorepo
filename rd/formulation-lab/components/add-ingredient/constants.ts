import type { AllergenRegion, IngredientFormData, NutritionLegislation } from "./types";

export const DRAFT_KEY = "ingredientDraft";

export const INITIAL_INGREDIENT_FORM_DATA: IngredientFormData = {
  name: "",
  commonName: "",
  isnAr: "",
  isnEn: "",
  code: "",
  groupId: "group_other",
  yieldAmount: 100,
  moistureLoss: 0,
  density: 1.0,
};

export const PREDEFINED_NUTRIENTS = [
  { id: "calories", key: "calories", defaultUnit: "kcal" },
  { id: "protein", key: "protein", defaultUnit: "g" },
  { id: "carbohydrates", key: "carbohydrates", defaultUnit: "g" },
  { id: "total_fat", key: "total_fat", defaultUnit: "g" },
  { id: "fiber", key: "fiber", defaultUnit: "g" },
  { id: "sugars", key: "sugars", defaultUnit: "g" },
  { id: "sodium", key: "sodium", defaultUnit: "mg" },
  { id: "custom", key: "custom_nutrient", defaultUnit: "g" },
];

export const ALLERGEN_LISTS: Record<AllergenRegion, string[]> = {
  FDA: [
    "allergen_milk", "allergen_eggs", "allergen_fish", "allergen_crustacean_shellfish",
    "allergen_tree_nuts", "allergen_peanuts", "allergen_wheat", "allergen_soybeans", "allergen_sesame"
  ],
  EU: [
    "allergen_celery", "allergen_cereals_gluten", "allergen_crustaceans", "allergen_eggs",
    "allergen_fish", "allergen_lupin", "allergen_milk", "allergen_molluscs", "allergen_mustard",
    "allergen_peanuts", "allergen_sesame", "allergen_soybeans", "allergen_sulphites", "allergen_tree_nuts"
  ],
  GSO: [
    "allergen_cereals_gluten", "allergen_crustaceans", "allergen_eggs", "allergen_fish",
    "allergen_peanuts", "allergen_soybeans", "allergen_milk", "allergen_tree_nuts",
    "allergen_celery", "allergen_mustard", "allergen_sesame", "allergen_sulphites"
  ]
};

export const TREE_NUT_OPTIONS = [
  "sub_allergen_almond", "sub_allergen_brazil_nut", "sub_allergen_cashew",
  "sub_allergen_hazelnut", "sub_allergen_macadamia", "sub_allergen_pecan",
  "sub_allergen_pine_nut", "sub_allergen_pistachio", "sub_allergen_walnut"
];

export const REFERENCE_MAP: Record<NutritionLegislation, Record<string, number>> = {
  FDA: {
    calories: 2000,
    protein: 50,
    carbohydrates: 275,
    total_fat: 78,
    fiber: 28,
    sugars: 50,
    sodium: 2300,
  },
  EU: {
    calories: 2000,
    protein: 50,
    carbohydrates: 260,
    total_fat: 70,
    fiber: 25,
    sugars: 90,
    sodium: 2400,
  },
  SFDA: {
    calories: 2000,
    protein: 50,
    carbohydrates: 260,
    total_fat: 70,
    fiber: 25,
    sugars: 90,
    sodium: 2400,
  },
};
