import type { EnrichedProject, Ingredient, RecipePhase } from "../../types";

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
  const { _id, _creationTime, teamId, userId, updatedAt, ...data } = {
    ...project,
    batchWeight,
    formulationState: project.formulationState || "Liquid",
    phases,
    ingredients,
  };

  return data;
}
