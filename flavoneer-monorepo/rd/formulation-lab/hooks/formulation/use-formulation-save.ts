import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { buildFormulationSavePayload } from "../../lib/formulation/save-payload";
import type { EnrichedProject, Ingredient, RecipePhase } from "../../types";
import { useToast } from "../useToast";

interface UseFormulationSaveArgs {
  canEdit: boolean;
  ingredients: Ingredient[];
  logAction: string;
  logPage: string;
  phases: RecipePhase[];
  project?: EnrichedProject;
  projectId?: Id<"projects">;
  successMessage: string;
}

export function useFormulationSave({
  canEdit,
  ingredients,
  logAction,
  logPage,
  phases,
  project,
  projectId,
  successMessage,
}: UseFormulationSaveArgs) {
  const { toast } = useToast();
  const updateProjectMutation = useMutation(api.projects.update);
  const logActivity = useMutation(api.activities.log);

  return async () => {
    if (!(project && projectId && canEdit)) {
      return;
    }

    await updateProjectMutation({
      id: projectId,
      ...buildFormulationSavePayload(project, phases, ingredients),
    });
    logActivity({
      action: logAction,
      target: project.name,
      page: logPage,
    });
    toast.success(successMessage);
  };
}
