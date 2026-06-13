import type { EnrichedProject, Ingredient, RecipePhase } from "../../types";

export function buildFormulationSavePayload(
  project: EnrichedProject,
  phases: RecipePhase[],
  ingredients: Ingredient[]
) {
  const { _id, _creationTime, teamId, userId, updatedAt, ...data } = {
    ...project,
    phases,
    ingredients,
  };

  return data;
}
