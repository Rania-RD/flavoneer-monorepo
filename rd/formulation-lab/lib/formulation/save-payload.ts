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
  const { batchYield } = calculateRecipeMeasures(
    batchWeight,
    project.servingSizeMode,
    project.servingSizeAmount ?? project.yield
  );
  const { _id, _creationTime, teamId, userId, updatedAt, ...data } = {
    ...project,
    batchWeight,
    yield: batchYield,
    formulationState: project.formulationState || "Liquid",
    servingSizeMode: project.servingSizeMode || "recipeMakes",
    servingSizeAmount: project.servingSizeAmount ?? project.yield,
    phases,
    ingredients,
  };

  return data;
}
