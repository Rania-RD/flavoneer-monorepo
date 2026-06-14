import type { Id } from "../../convex/_generated/dataModel";

export type AllergenRegion = "FDA" | "EU" | "GSO";
export type NutritionLegislation = "FDA" | "EU" | "SFDA";

export interface IngredientFormData {
  code: string;
  commonName: string;
  density: number;
  groupId: string;
  isnAr: string;
  isnEn: string;
  moistureLoss: number;
  name: string;
  price: number;
  yieldAmount: number;
}

export interface SubIngredientDraft {
  id: string;
  ingredientId: string;
  percentage: string;
}

export interface ConversionDraft {
  grams: string;
  id: string;
  unit: string;
}

export interface NutrientDraft {
  customName: string;
  id: string;
  predefinedId: string;
  unit: string;
  value: string;
}

export interface IngredientSavePayload {
  allergenRegion: AllergenRegion;
  allergenValues: string[];
  allergenVerified: boolean;
  code: string;
  commonName: string;
  conversions: { grams: number; unit: string }[];
  coverImageId?: Id<"_storage">;
  density: number;
  groupId: string;
  insNumber?: string;
  isAdditive?: boolean;
  isComposite: boolean;
  isnAr: string;
  isnEn: string;
  moistureLoss: number;
  name: string;
  nutrientValues: { nutrientName: string; unit: string; value: number }[];
  price: number;
  subAllergenValues: Record<string, string[]>;
  subIngredients?: { ingredientId: Id<"ingredients">; percentage: number }[];
  teamId?: Id<"teams">;
  yieldAmount: number;
}

export interface ValidationMessage {
  key?: string;
  text?: string;
}
