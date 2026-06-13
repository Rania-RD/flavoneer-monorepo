import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import type { Id } from "../../convex/_generated/dataModel";
import type { SpreadsheetFormulaContext } from "../../lib/spreadsheet/formula-engine";
import type {
  AggregatedIngredient,
  RecipePhase,
  RecipeStep,
  StepDependency,
  StepType,
} from "../../types";

export interface PhaseColorStyle {
  bg: string;
  border: string;
  darkBg?: string;
  darkBorder?: string;
  darkText?: string;
  text: string;
}

export interface AvailableDependencyStep {
  key: string;
  label: string;
  phaseLetter: string;
  stepNumber: number;
}

export interface PhaseProps {
  additiveLimits?: Record<string, unknown>;
  aggregatedIngredients?: AggregatedIngredient[];
  availableStepsToDependOn: AvailableDependencyStep[];
  colorStyle: PhaseColorStyle;
  dragHandleProps?: DraggableAttributes & DraggableSyntheticListeners;
  getDependency: (stepKey: string) => StepDependency | undefined;
  isDraggingPhase?: boolean;
  isStepLocked: (stepKey: string) => boolean;
  letter: string;
  onAddStep: (type: StepType) => void;
  onDelete?: () => void;
  onDeleteStep: (stepId: string) => void;
  onReorderSteps?: (startIndex: number, endIndex: number) => void;
  onSaveDependency: (
    stepKey: string,
    dependsOn: string[],
    condition: "AND" | "OR"
  ) => void;
  onUpdateName: (name: string) => void;
  onUpdateStep: (stepId: string, updates: Partial<RecipeStep>) => void;
  phase: RecipePhase;
  projectId?: Id<"projects">;
  readOnly?: boolean;
  formulationContext?: SpreadsheetFormulaContext;
}
