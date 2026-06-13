import type { TFunction } from "i18next";
import type { Id } from "../../convex/_generated/dataModel";
import { normalizeInsNumber } from "../../convex/regulatoryHelpers";
import type { IngredientEditorData, IngredientListItem } from "../../types";
import {
  INITIAL_INGREDIENT_FORM_DATA,
  PREDEFINED_NUTRIENTS,
  REFERENCE_MAP,
} from "./constants";
import type {
  AllergenRegion,
  ConversionDraft,
  IngredientFormData,
  IngredientSavePayload,
  NutrientDraft,
  NutritionLegislation,
  SubIngredientDraft,
  ValidationMessage,
} from "./types";

export const createInitialIngredientFormData = (): IngredientFormData => ({
  ...INITIAL_INGREDIENT_FORM_DATA,
});

export const hydrateIngredientFormData = (
  ingredient: IngredientEditorData
): IngredientFormData => ({
  name: ingredient.name || "",
  commonName: ingredient.commonName || "",
  isnAr: ingredient.isnAr || "",
  isnEn: ingredient.isnEn || "",
  code: ingredient.code || "",
  groupId: ingredient.groupId || "group_other",
  yieldAmount: ingredient.yieldAmount ?? 100,
  moistureLoss: ingredient.moistureLoss ?? 0,
  density: ingredient.density ?? 1.0,
});

export const hydrateSubIngredients = (
  ingredient: IngredientEditorData
): SubIngredientDraft[] =>
  ingredient.subIngredients?.map((sub) => ({
    id: crypto.randomUUID(),
    ingredientId: sub.ingredientId,
    percentage: sub.percentage.toString(),
  })) || [];

export const hydrateConversions = (
  ingredient: IngredientEditorData
): ConversionDraft[] =>
  ingredient.conversions?.map((conversion) => ({
    id: crypto.randomUUID(),
    unit: conversion.unit,
    grams: conversion.grams.toString(),
  })) || [];

export const hydrateNutrients = (
  ingredient: IngredientEditorData,
  t: TFunction
): NutrientDraft[] =>
  ingredient.nutrientValues?.map((nutrient) => {
    const found = PREDEFINED_NUTRIENTS.find(
      (predefined) =>
        predefined.id === nutrient.nutrientName ||
        t(predefined.id) === nutrient.nutrientName
    );

    return {
      id: crypto.randomUUID(),
      predefinedId: found?.id ?? "custom",
      customName: found ? "" : nutrient.nutrientName,
      value: nutrient.value.toString(),
      unit: nutrient.unit,
    };
  }) || [];

export const computeCompositeNutrients = (
  isComposite: boolean,
  subIngredients: SubIngredientDraft[],
  allIngredients: IngredientListItem[]
): Record<string, number> => {
  const map: Record<string, number> = {};
  if (!isComposite) {
    return map;
  }

  for (const sub of subIngredients) {
    const percentage = Number(sub.percentage);
    if (Number.isNaN(percentage) || percentage <= 0) {
      continue;
    }
    const source = allIngredients.find((ingredient) => ingredient._id === sub.ingredientId);
    if (!source?.nutrientValues) {
      continue;
    }

    const factor = percentage / 100;
    for (const nutrient of source.nutrientValues) {
      map[nutrient.nutrientName] =
        (map[nutrient.nutrientName] || 0) + nutrient.value * factor;
    }
  }
  return map;
};

export const calculateDailyValue = (
  nutrientKey: string,
  value: string,
  legislation: NutritionLegislation
): string => {
  if (nutrientKey === "custom" || !nutrientKey || !value) {
    return "-";
  }

  const referenceValue = REFERENCE_MAP[legislation][nutrientKey];
  if (!referenceValue) {
    return "-";
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue) || numericValue < 0) {
    return "-";
  }
  return `${Math.round((numericValue / referenceValue) * 100)}%`;
};

export const getIngredientValidationMessage = ({
  conversions,
  formData,
  insNumber,
  isAdditive,
  isComposite,
  subIngredients,
  totalSubPercentage,
}: {
  conversions: ConversionDraft[];
  formData: IngredientFormData;
  insNumber: string;
  isAdditive: boolean;
  isComposite: boolean;
  subIngredients: SubIngredientDraft[];
  totalSubPercentage: number;
}): ValidationMessage | null => {
  if (!formData.name.trim() || !formData.code.trim() || !formData.groupId.trim()) {
    return {
      key: "please_fill_required_fields_material",
    };
  }
  if (isAdditive && !normalizeInsNumber(insNumber)) {
    return { key: "ins_number_required" };
  }

  const yieldAmount = Number(formData.yieldAmount);
  const moistureLoss = Number(formData.moistureLoss);
  const density = Number(formData.density);
  if (Number.isNaN(yieldAmount) || Number.isNaN(moistureLoss) || Number.isNaN(density)) {
    return { key: "invalid_manufacturing_numbers" };
  }

  for (const conversion of conversions) {
    if (!conversion.unit.trim()) {
      return { key: "conversion_unit_required" };
    }
    const grams = Number(conversion.grams);
    if (Number.isNaN(grams) || grams <= 0) {
      return { key: "conversion_weight_positive" };
    }
  }

  if (!isComposite) {
    return null;
  }
  if (totalSubPercentage !== 100) {
    return { key: "sum_warning" };
  }
  for (const subIngredient of subIngredients) {
    if (!subIngredient.ingredientId) {
      return { key: "sub_ingredient_selection_required" };
    }
  }
  return null;
};

export const buildIngredientSavePayload = ({
  activeTeamId,
  allergenRegion,
  allergenValues,
  allergenVerified,
  computedNutrients,
  conversions,
  coverImageId,
  formData,
  insNumber,
  isAdditive,
  isComposite,
  nutrientValues,
  overriddenNutrients,
  subAllergens,
  subIngredients,
  t,
}: {
  activeTeamId?: Id<"teams">;
  allergenRegion: AllergenRegion;
  allergenValues: string[];
  allergenVerified: boolean;
  computedNutrients: Record<string, number>;
  conversions: ConversionDraft[];
  coverImageId?: Id<"_storage">;
  formData: IngredientFormData;
  insNumber: string;
  isAdditive: boolean;
  isComposite: boolean;
  nutrientValues: NutrientDraft[];
  overriddenNutrients: Record<string, boolean>;
  subAllergens: Record<string, string[]>;
  subIngredients: SubIngredientDraft[];
  t: TFunction;
}): IngredientSavePayload => {
  const finalNutrients = nutrientValues.map((nutrient) => {
    const isCustom = nutrient.predefinedId === "custom";
    const nutrientName = isCustom ? nutrient.customName : t(nutrient.predefinedId);
    let finalValue = Number(nutrient.value) || 0;

    if (isComposite) {
      const computedValue = computedNutrients[nutrientName];
      if (computedValue !== undefined && !overriddenNutrients[nutrient.id]) {
        finalValue = Number(computedValue.toFixed(2));
      }
    }

    return {
      nutrientName,
      value: finalValue,
      unit: nutrient.unit,
    };
  });

  return {
    name: formData.name,
    commonName: formData.commonName,
    isnAr: formData.isnAr.trim() || formData.name,
    isnEn: formData.isnEn.trim() || formData.commonName || formData.name,
    code: formData.code,
    groupId: formData.groupId,
    isAdditive,
    insNumber: isAdditive ? normalizeInsNumber(insNumber) : undefined,
    yieldAmount: Number(formData.yieldAmount),
    moistureLoss: Number(formData.moistureLoss),
    density: Number(formData.density),
    conversions: conversions.map((conversion) => ({
      unit: conversion.unit,
      grams: Number(conversion.grams),
    })),
    isComposite,
    subIngredients: isComposite
      ? subIngredients.map((subIngredient) => ({
          ingredientId: subIngredient.ingredientId as Id<"ingredients">,
          percentage: Number(subIngredient.percentage),
        }))
      : undefined,
    nutrientValues: finalNutrients,
    allergenValues,
    allergenRegion,
    allergenVerified,
    subAllergenValues: subAllergens,
    teamId: activeTeamId ?? undefined,
    coverImageId,
  };
};
