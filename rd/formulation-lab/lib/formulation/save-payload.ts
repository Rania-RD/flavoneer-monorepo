import type { EnrichedProject, Ingredient, RecipePhase } from "../../types";

export type ServingSizeUnit = "g" | "kg" | "mg" | "ml";

const SERVING_UNIT_TO_GRAMS: Record<ServingSizeUnit, number> = {
  g: 1,
  kg: 1000,
  mg: 0.001,
  ml: 1,
};

export function normalizeServingAmountToGrams(
  amount: number,
  unit: ServingSizeUnit = "g"
) {
  return Number((amount * SERVING_UNIT_TO_GRAMS[unit]).toFixed(6));
}

export function calculateRecipeMeasures(
  batchWeight: number,
  servingSizeMode: EnrichedProject["servingSizeMode"],
  servingSizeAmount?: number,
  servingSizeUnit: ServingSizeUnit = "g"
) {
  const amount =
    typeof servingSizeAmount === "number" && servingSizeAmount > 0
      ? servingSizeAmount
      : 0;
  const mode = servingSizeMode ?? "recipeMakes";
  const normalizedServingAmount =
    mode === "servingIs"
      ? normalizeServingAmountToGrams(amount, servingSizeUnit)
      : amount;
  const servingSizeWeight =
    normalizedServingAmount > 0
      ? mode === "recipeMakes"
        ? batchWeight / normalizedServingAmount
        : normalizedServingAmount
      : 0;
  const servingCount =
    normalizedServingAmount > 0
      ? mode === "recipeMakes"
        ? normalizedServingAmount
        : batchWeight / normalizedServingAmount
      : 0;
  const batchYield = Number((servingCount * servingSizeWeight).toFixed(6));

  return {
    batchYield,
    servingCount: Number(servingCount.toFixed(6)),
    servingSizeWeight: Number(servingSizeWeight.toFixed(6)),
  };
}

const UNIT_TO_KG: Record<string, number> = {
  g: 0.001,
  gram: 0.001,
  grams: 0.001,
  kg: 1,
  kilogram: 1,
  kilograms: 1,
};

export function calculateRecipeCosts(
  ingredients: Ingredient[],
  servingCount: number
) {
  const batchCost = Number(
    ingredients
      .reduce((total, ingredient) => {
        const unitFactor =
          UNIT_TO_KG[(ingredient.unit || "g").toLowerCase()] ?? 0.001;
        return (
          total +
          ingredient.weight * unitFactor * (ingredient.costPerKg ?? 0)
        );
      }, 0)
      .toFixed(2)
  );
  const costPerServing =
    servingCount > 0 ? Number((batchCost / servingCount).toFixed(2)) : 0;

  return {
    batchCost,
    costPerServing,
  };
}

export function calculatePackagingCosts({
  costPerServing,
  packagingUnitPrice,
}: {
  costPerServing: number;
  packagingUnitPrice?: number;
}) {
  const packagingCostPerUnit =
    typeof packagingUnitPrice === "number" && packagingUnitPrice > 0
      ? Number(packagingUnitPrice.toFixed(2))
      : 0;
  const finishedGoodCostPerUnit = Number(
    (costPerServing + packagingCostPerUnit).toFixed(2)
  );

  return {
    packagingCostPerUnit,
    finishedGoodCostPerUnit,
  };
}

export function isServingOverPackagingCapacity({
  packagingCapacity,
  servingSizeWeight,
}: {
  packagingCapacity?: number;
  servingSizeWeight: number;
}) {
  return (
    typeof packagingCapacity === "number" &&
    packagingCapacity > 0 &&
    servingSizeWeight > packagingCapacity
  );
}

export function calculateProjectRDCost(
  existingTotal: number | undefined,
  existingBatchCost: number | undefined,
  currentBatchCost: number
) {
  if (existingTotal === undefined) {
    return currentBatchCost;
  }
  if (existingBatchCost === undefined) {
    return Number((existingTotal + currentBatchCost).toFixed(2));
  }
  return existingTotal;
}

export function buildFormulationSavePayload(
  project: EnrichedProject,
  phases: RecipePhase[],
  ingredients: Ingredient[]
) {
  const persistedIngredients = ingredients.map(
    ({ nutritionPer100g: _nutritionPer100g, ...ingredient }) => ingredient
  );
  const batchWeight = Number(
    persistedIngredients
      .reduce((total, ingredient) => total + ingredient.weight, 0)
      .toFixed(6)
  );
  const { batchYield, servingCount } = calculateRecipeMeasures(
    batchWeight,
    project.servingSizeMode,
    project.servingSizeAmount ?? project.yield,
    project.servingSizeUnit ?? "g"
  );
  const { costPerServing, batchCost } = calculateRecipeCosts(
    persistedIngredients,
    servingCount
  );
  const { packagingCostPerUnit, finishedGoodCostPerUnit } =
    calculatePackagingCosts({
      costPerServing,
      packagingUnitPrice: project.packagingUnitPrice,
    });
  const totalProjectRDCost = calculateProjectRDCost(
    project.totalProjectRDCost,
    project.batchCost,
    batchCost
  );
  const { _id, _creationTime, teamId, userId, updatedAt, ...data } = {
    ...project,
    batchWeight,
    batchCost,
    costPerServing,
    packagingCostPerUnit,
    finishedGoodCostPerUnit,
    totalProjectRDCost,
    yield: batchYield,
    formulationState: project.formulationState || "Liquid",
    servingSizeMode: project.servingSizeMode || "recipeMakes",
    servingSizeAmount: project.servingSizeAmount ?? project.yield,
    servingSizeUnit: project.servingSizeUnit || "g",
    phases,
    ingredients: persistedIngredients,
  };

  return data;
}
