import type { EnrichedProject, Ingredient, RecipePhase } from "../../types";

export function buildFormulationSavePayload(
  project: EnrichedProject,
  phases: RecipePhase[],
  ingredients: Ingredient[]
) {
  const { _id, _creationTime, teamId, userId, updatedAt, ...data } = {
    ...project,
    formulationState: project.formulationState || "Liquid",
    phases,
    ingredients,
  };

  return data;
}
