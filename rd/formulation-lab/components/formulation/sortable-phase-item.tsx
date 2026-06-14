import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type React from "react";
import type { Id } from "../../convex/_generated/dataModel";
import type {
  FlatStepReference,
  PhaseColorStyle,
} from "../../lib/formulation/helpers";
import type { SpreadsheetFormulaContext } from "../../lib/spreadsheet/formula-engine";
import type {
  AggregatedIngredient,
  RecipePhase,
  RecipeStep,
  StepDependency,
  StepType,
} from "../../types";
import { Phase } from "../Phase";

interface SortablePhaseItemProps {
  additiveLimits?: Record<string, unknown>;
  addStep: (phaseId: string, type: StepType) => void;
  addStepAfter: (phaseId: string, afterStepId: string, type: StepType) => void;
  aggregatedIngredients: AggregatedIngredient[];
  canEdit: boolean;
  deletePhase: (phaseId: string) => void;
  deleteStep: (phaseId: string, stepId: string) => void;
  flatSteps: FlatStepReference[];
  formulationContext?: SpreadsheetFormulaContext;
  handleSaveDependency: (
    stepKey: string,
    dependsOn: string[],
    condition: "AND" | "OR"
  ) => void;
  isStepLocked: (stepKey: string) => boolean;
  itemRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  pColor: PhaseColorStyle;
  phase: RecipePhase;
  phaseIdStr: string;
  projectId?: Id<"projects">;
  reorderStep: (phaseId: string, startIndex: number, endIndex: number) => void;
  stepDependencies: Record<string, StepDependency>;
  updatePhase: (phaseId: string, updates: Partial<RecipePhase>) => void;
  updateStep: (
    phaseId: string,
    stepId: string,
    updates: Partial<RecipeStep>
  ) => void;
}

export const SortablePhaseItem = ({
  phase,
  canEdit,
  phaseIdStr,
  pColor,
  flatSteps,
  stepDependencies,
  additiveLimits,
  aggregatedIngredients,
  isStepLocked,
  addStep,
  addStepAfter,
  deletePhase,
  deleteStep,
  reorderStep,
  handleSaveDependency,
  updatePhase,
  updateStep,
  itemRefs,
  projectId,
  formulationContext,
}: SortablePhaseItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: phase.id,
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  return (
    <div
      className={`space-y-6 transition-opacity duration-300 ${
        isDragging ? "scale-[1.01] opacity-50 shadow-2xl" : ""
      }`}
      ref={(el) => {
        setNodeRef(el);
        if (itemRefs && el) {
          itemRefs.current[phase.id] = el;
        }
      }}
      style={style}
    >
      <Phase
        additiveLimits={additiveLimits}
        aggregatedIngredients={aggregatedIngredients}
        availableStepsToDependOn={flatSteps}
        colorStyle={pColor}
        dragHandleProps={
          { ...attributes, ...listeners } as DraggableAttributes &
            DraggableSyntheticListeners
        }
        getDependency={(stepKey: string) => stepDependencies[stepKey]}
        isDraggingPhase={isDragging}
        isStepLocked={isStepLocked}
        letter={phaseIdStr}
        onAddStep={(type: StepType) => addStep(phase.id, type)}
        onAddStepAfter={(stepId: string, type: StepType) =>
          addStepAfter(phase.id, stepId, type)
        }
        onDelete={canEdit ? () => deletePhase(phase.id) : undefined}
        onDeleteStep={(stepId: string) => deleteStep(phase.id, stepId)}
        onReorderSteps={(startIndex: number, endIndex: number) =>
          reorderStep(phase.id, startIndex, endIndex)
        }
        onSaveDependency={handleSaveDependency}
        onUpdateName={(name: string) => updatePhase(phase.id, { name })}
        onUpdateStep={(stepId: string, updates: Partial<RecipeStep>) =>
          updateStep(phase.id, stepId, updates)
        }
        phase={phase}
        projectId={projectId}
        readOnly={!canEdit}
        formulationContext={formulationContext}
      />
    </div>
  );
};
