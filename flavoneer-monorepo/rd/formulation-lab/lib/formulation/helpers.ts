import type { Id } from "../../convex/_generated/dataModel";
import type {
  AggregatedIngredient,
  Ingredient,
  IngredientListItem,
  InventoryListItem,
  PhaseColor,
  RecipePhase,
  RecipeStep,
  StepDependency,
  StepType,
} from "../../types";
import { createDefaultMiniSpreadsheet } from "../spreadsheet/defaults";

export const COLORS_ARRAY: PhaseColor[] = [
  "blue",
  "green",
  "purple",
  "orange",
  "rose",
  "slate",
];

export const COLORS: Record<
  PhaseColor,
  {
    bg: string;
    border: string;
    text: string;
    darkBg: string;
    darkBorder: string;
    darkText: string;
  }
> = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-900",
    darkBg: "dark:bg-blue-900/10",
    darkBorder: "dark:border-blue-800/30",
    darkText: "dark:text-blue-100",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-100",
    text: "text-green-900",
    darkBg: "dark:bg-green-900/10",
    darkBorder: "dark:border-green-800/30",
    darkText: "dark:text-green-100",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-100",
    text: "text-orange-900",
    darkBg: "dark:bg-orange-900/10",
    darkBorder: "dark:border-orange-800/30",
    darkText: "dark:text-orange-100",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-100",
    text: "text-purple-900",
    darkBg: "dark:bg-purple-900/10",
    darkBorder: "dark:border-purple-800/30",
    darkText: "dark:text-purple-100",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-100",
    text: "text-rose-900",
    darkBg: "dark:bg-rose-900/10",
    darkBorder: "dark:border-rose-800/30",
    darkText: "dark:text-rose-100",
  },
  slate: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-900",
    darkBg: "dark:bg-slate-800",
    darkBorder: "dark:border-slate-700",
    darkText: "dark:text-slate-100",
  },
};

export const ALPHABET_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const ADD_REGEX = /^Add\s+/i;

export type PhaseColorStyle = (typeof COLORS)[PhaseColor];

export interface FlatStepReference {
  isCompleted: boolean;
  key: string;
  label: string;
  phaseLetter: string;
  stepNumber: number;
}

export function buildAggregatedIngredients(
  ingredientsList: IngredientListItem[],
  inventoryItems?: InventoryListItem[]
): AggregatedIngredient[] {
  return ingredientsList
    .filter((ing) => ing.status === "Approved")
    .map((ing) => {
      const relatedInv = inventoryItems
        ? inventoryItems.filter(
            (inv) =>
              inv.ingredientId === ing._id || inv.ingredientCode === ing.code
          )
        : [];
      const totalStock = relatedInv.reduce(
        (sum, inv) => sum + (inv.stock || 0),
        0
      );
      const expiries = relatedInv
        .map((inv) => new Date(inv.expiryDate).getTime())
        .filter((time) => !Number.isNaN(time));
      const nearestExpiry =
        expiries.length > 0
          ? new Date(Math.min(...expiries)).toISOString().split("T")[0]
          : null;

      return {
        _id: ing._id,
        name: ing.name,
        unit: ing.conversions?.[0]?.unit || "g",
        stock: totalStock,
        nearestExpiry,
        allergens: ing.allergenValues || [],
        isAdditive: ing.isAdditive,
        insNumber: ing.insNumber,
        normalizedInsNumber: ing.normalizedInsNumber,
      };
    });
}

export function getAdditiveIngredientIds(
  phases: RecipePhase[],
  aggregatedIngredients: AggregatedIngredient[]
) {
  const ids = new Set<Id<"ingredients">>();
  for (const phase of phases) {
    for (const step of phase.steps) {
      if (step.type === "weighing" && step.ingredientId) {
        const ingredient = aggregatedIngredients.find(
          (item) => item._id === step.ingredientId
        );
        if (ingredient?.isAdditive) {
          ids.add(step.ingredientId as Id<"ingredients">);
        }
      }
    }
  }
  return Array.from(ids);
}

export function getFlatSteps(phases: RecipePhase[]): FlatStepReference[] {
  const arr: FlatStepReference[] = [];
  phases.forEach((phase, phaseIndex) => {
    const phaseIdStr = ALPHABET_MAP[phaseIndex % 26];
    phase.steps.forEach((step, stepIndex) => {
      arr.push({
        key: step.id,
        label: step.label,
        phaseLetter: phaseIdStr,
        stepNumber: stepIndex + 1,
        isCompleted: step.isCompleted ?? false,
      });
    });
  });
  return arr;
}

export function getIsStepLocked(
  stepKey: string,
  stepDependencies: Record<string, StepDependency>,
  flatSteps: FlatStepReference[]
) {
  const dependency = stepDependencies[stepKey];
  if (!dependency || dependency.dependsOnStepKeys.length === 0) {
    return false;
  }

  const depsMask = dependency.dependsOnStepKeys.map((depKey) => {
    const flatStep = flatSteps.find((step) => step.key === depKey);
    return flatStep ? flatStep.isCompleted : false;
  });

  if (dependency.condition === "AND") {
    return !depsMask.every((isComplete) => isComplete);
  }
  return !depsMask.some((isComplete) => isComplete);
}

export function deriveIngredients(
  phases: RecipePhase[],
  aggregatedIngredients: AggregatedIngredient[]
): Ingredient[] {
  const ingredientMap = new Map<string, Ingredient>();
  for (const phase of phases) {
    for (const step of phase.steps) {
      if (step.type === "weighing" && step.ingredientId) {
        const existing = ingredientMap.get(step.ingredientId);
        if (existing) {
          ingredientMap.set(step.ingredientId, {
            ...existing,
            weight: existing.weight + (step.expectedWeight || 0),
          });
        } else {
          const ingItem = aggregatedIngredients.find(
            (item) => item._id === step.ingredientId
          );
          ingredientMap.set(step.ingredientId, {
            id: step.ingredientId,
            name: ingItem?.name || step.label.replace(ADD_REGEX, ""),
            weight: step.expectedWeight || 0,
            unit: step.unit || ingItem?.unit || "g",
          });
        }
      }
    }
  }

  const ingredients = Array.from(ingredientMap.values());
  const totalWeight = ingredients.reduce((sum, ing) => sum + ing.weight, 0);
  return ingredients.map((ing) => ({
    ...ing,
    percentage: totalWeight > 0 ? (ing.weight / totalWeight) * 100 : 0,
  }));
}

export function createInitialPhases(
  ingredients: Ingredient[],
  phaseName: string
): RecipePhase[] {
  const initialSteps: RecipeStep[] = ingredients.map((ing) => ({
    id: `step-${ing.id}-${Date.now()}`,
    type: "weighing",
    label: `Add ${ing.name}`,
    ingredientId: ing.id,
    expectedWeight: ing.weight,
    notes: "",
  }));

  return [
    {
      id: "phase-1",
      name: phaseName,
      color: COLORS_ARRAY[0],
      steps: initialSteps,
    },
  ];
}

export function createPhase(name: string, phaseCount: number): RecipePhase {
  return {
    id: `phase-${Date.now()}`,
    name,
    color: COLORS_ARRAY[phaseCount % COLORS_ARRAY.length],
    steps: [],
  };
}

export function createStep(
  type: StepType,
  criticalParamName: string,
  spreadsheetLabel = "Mini Spreadsheet"
): RecipeStep {
  const id = `step-${Date.now()}`;
  return {
    id,
    type,
    label:
      {
        weighing: "Weighing",
        timer: "Timer Period",
        critical_check: "Critical Check",
        spreadsheet_note: spreadsheetLabel,
      }[type as string] || "Instruction",
    durationSeconds: type === "timer" ? 60 : undefined,
    expectedWeight: type === "weighing" ? 0 : undefined,
    criticalParams:
      type === "critical_check" ? [{ name: criticalParamName }] : undefined,
    spreadsheet:
      type === "spreadsheet_note" ? createDefaultMiniSpreadsheet(id) : undefined,
  };
}

export function recolorPhases(phases: RecipePhase[]): RecipePhase[] {
  return phases.map((phase, index) => ({
    ...phase,
    color: COLORS_ARRAY[index % COLORS_ARRAY.length],
  }));
}
