import type { RecipePhase, RecipeStep, StepType } from "../../types";
import { createPhase, createStep, recolorPhases } from "./helpers";

export function addPhaseToPhases(
  phases: RecipePhase[],
  phaseName: string
): { phases: RecipePhase[]; newPhase: RecipePhase } {
  const newPhase = createPhase(phaseName, phases.length);
  return { phases: [...phases, newPhase], newPhase };
}

export function updatePhaseInPhases(
  phases: RecipePhase[],
  phaseId: string,
  updates: Partial<RecipePhase>
): RecipePhase[] {
  return phases.map((phase) =>
    phase.id === phaseId ? { ...phase, ...updates } : phase
  );
}

export function deletePhaseFromPhases(
  phases: RecipePhase[],
  phaseId: string
): RecipePhase[] {
  return recolorPhases(phases.filter((phase) => phase.id !== phaseId));
}

export function addStepToPhase(
  phases: RecipePhase[],
  phaseId: string,
  type: StepType,
  criticalParamName: string,
  spreadsheetLabel = "Mini Spreadsheet"
): { phases: RecipePhase[]; newStep: RecipeStep } {
  const newStep = createStep(type, criticalParamName, spreadsheetLabel);
  return {
    phases: phases.map((phase) =>
      phase.id === phaseId
        ? { ...phase, steps: [...phase.steps, newStep] }
        : phase
    ),
    newStep,
  };
}

export function updateStepInPhase(
  phases: RecipePhase[],
  phaseId: string,
  stepId: string,
  updates: Partial<RecipeStep>
): RecipePhase[] {
  return phases.map((phase) =>
    phase.id === phaseId
      ? {
          ...phase,
          steps: phase.steps.map((step) =>
            step.id === stepId ? { ...step, ...updates } : step
          ),
        }
      : phase
  );
}

export function deleteStepFromPhase(
  phases: RecipePhase[],
  phaseId: string,
  stepId: string
): RecipePhase[] {
  return phases.map((phase) =>
    phase.id === phaseId
      ? { ...phase, steps: phase.steps.filter((step) => step.id !== stepId) }
      : phase
  );
}

export function reorderStepInPhase(
  phases: RecipePhase[],
  phaseId: string,
  startIndex: number,
  endIndex: number
): RecipePhase[] {
  if (startIndex === endIndex) {
    return phases;
  }

  return phases.map((phase) => {
    if (phase.id !== phaseId) {
      return phase;
    }
    const steps = Array.from(phase.steps);
    const [removed] = steps.splice(startIndex, 1);
    steps.splice(endIndex, 0, removed);
    return { ...phase, steps };
  });
}

export function reorderPhases(
  phases: RecipePhase[],
  startIndex: number,
  endIndex: number
): RecipePhase[] {
  if (startIndex === endIndex) {
    return phases;
  }

  const nextPhases = Array.from(phases);
  const [removed] = nextPhases.splice(startIndex, 1);
  nextPhases.splice(endIndex, 0, removed);
  return recolorPhases(nextPhases);
}
