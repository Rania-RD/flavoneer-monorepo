import type { EnrichedProject, Ingredient, RecipePhase } from "../../types";

export function calculateRecipeMeasures(
  batchWeight: number,
  servingSizeMode: EnrichedProject["servingSizeMode"],
  servingSizeAmount?: number
) {
  const amount =
    typeof servingSizeAmount === "number" && servingSizeAmount > 0
      ? servingSizeAmount
      : 0;
  const mode = servingSizeMode ?? "recipeMakes";
  const servingSizeWeight =
    amount > 0
      ? mode === "recipeMakes"
        ? batchWeight / amount
        : amount
      : 0;
  const servingCount =
    amount > 0
      ? mode === "recipeMakes"
        ? amount
        : batchWeight / amount
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
  const batchWeight = Number(
    ingredients
      .reduce((total, ingredient) => total + ingredient.weight, 0)
      .toFixed(6)
  );
  const { batchYield, servingCount } = calculateRecipeMeasures(
    batchWeight,
    project.servingSizeMode,
    project.servingSizeAmount ?? project.yield
  );
  const { costPerServing, batchCost } = calculateRecipeCosts(
    ingredients,
    servingCount
  );
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
    totalProjectRDCost,
    yield: batchYield,
    formulationState: project.formulationState || "Liquid",
    servingSizeMode: project.servingSizeMode || "recipeMakes",
    servingSizeAmount: project.servingSizeAmount ?? project.yield,
    phases,
    ingredients,
  };

  return data;
}
