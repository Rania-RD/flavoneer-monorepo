import type {
  EnrichedProject,
  RecipePhase,
  RunListItem,
  RunRecipePhase,
  RunRecipeStep,
  RunRecord,
} from "../../types";

export const hydrateRunPhases = (
  phases: RunListItem["phases"]
): RunRecipePhase[] => {
  return (
    phases?.map((phase) => ({
      ...phase,
      color: phase.color as RunRecipePhase["color"],
      steps:
        phase.steps?.map(
          (step): RunRecipeStep => ({
            ...step,
            type: step.type as RunRecipeStep["type"],
            isCompleted: step.isCompleted ?? false,
          })
        ) || [],
    })) || []
  );
};

export const toRunRecord = (run: RunListItem): RunRecord => ({
  batchCode: run.batchCode,
  data: run.data,
  durationString: run.durationString,
  endTime: new Date(run.endTime ?? Date.now()),
  id: run._id,
  phases: hydrateRunPhases(run.phases),
  projectId: run.projectId,
  projectName: run.projectName,
  startTime: new Date(run.startTime),
  status:
    run.status === "completed" ||
    run.status === "failed" ||
    run.status === "In Progress"
      ? run.status
      : undefined,
});

export function buildCompletedRunPhases(
  phases: RecipePhase[],
  runValues: Record<string, number>
): RecipePhase[] {
  return phases.map((phase) => ({
    ...phase,
    steps: phase.steps.map((step) => ({
      ...step,
      actualWeight: runValues[step.id],
      isCompleted: true,
    })),
  }));
}

export function buildIngredientsUsage(
  phases: RecipePhase[],
  runValues: Record<string, number>,
  selectedProject?: EnrichedProject | null
): Array<{ name: string; actualWeight: number; unit?: string }> {
  if (!selectedProject?.ingredients) {
    return [];
  }

  const usage: Array<{ name: string; actualWeight: number; unit?: string }> = [];
  for (const phase of phases) {
    for (const step of phase.steps) {
      if (step.type !== "weighing" || !step.ingredientId) {
        continue;
      }

      const actualWeight = runValues[step.id];
      if (actualWeight === undefined || actualWeight <= 0) {
        continue;
      }

      const ingredient = selectedProject.ingredients.find(
        (item) => item.id === step.ingredientId
      );
      if (ingredient) {
        usage.push({
          name: ingredient.name,
          actualWeight,
          unit: ingredient.unit,
        });
      }
    }
  }
  return usage;
}
