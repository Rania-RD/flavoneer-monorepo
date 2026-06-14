import type { FunctionReturnType } from "convex/server";
import type { api } from "./convex/_generated/api";
import type { Doc, Id } from "./convex/_generated/dataModel";

// ─── Backend-derived types (from Convex schema) ─────────────
export type Project = Doc<"projects">;
export type InventoryItem = Doc<"inventoryItems">;
export type IngredientDoc = Doc<"ingredients">;
export type FoodCategoryDoc = Doc<"foodCategories">;
export type FoodAdditiveDoc = Doc<"foodAdditives">;
export type AdditiveLimitDoc = Doc<"additiveLimits">;
export type LabReport = Doc<"labReports">;
export type Equipment = Doc<"equipment">;
export type Team = Doc<"teams">;
export type TeamMember = Doc<"teamMembers">;
export type TeamInvite = Doc<"teamInvites">;
export type TeamAuditLog = Doc<"teamAuditLogs">;

// ─── New normalized table types ──────────────────────────────
export type ProjectIngredientDoc = Doc<"projectIngredients">;
export type RecipePhaseDoc = Doc<"recipePhases">;
export type RecipeStepDoc = Doc<"recipeSteps">;
export type LabTestResultDoc = Doc<"labTestResults">;
export type StepDependencyDoc = Doc<"stepDependencies">;

export type IngredientListItem = FunctionReturnType<
  typeof api.ingredients.list
>[number];
export type IngredientEditorData = Omit<IngredientListItem, "_id"> & {
  _id?: Id<"ingredients">;
};
export type IngredientDependencyData = FunctionReturnType<
  typeof api.ingredients.getDependencies
>;
export type InventoryListItem = FunctionReturnType<
  typeof api.inventory.list
>[number];
export type RunListItem = FunctionReturnType<
  typeof api.runs.list
>["page"][number];
export type EnrichedRun = Exclude<
  FunctionReturnType<typeof api.runs.get>,
  null
>;

// ─── Enriched / joined shapes (returned by backend queries) ──
// These match the shape the backend enrichment produces for backwards compat

export interface Ingredient {
  costPerKg?: number;
  id: string;
  name: string;
  percentage?: number;
  unit?: string;
  weight: number;
}

export interface RecipeStep {
  actualWeight?: number;
  criticalParams?: {
    name: string;
    min?: number;
    max?: number;
    unit?: string;
  }[];
  durationSeconds?: number;
  expectedWeight?: number;
  id: string;
  ingredientId?: string;
  isCompleted?: boolean;
  isLocked?: boolean;
  label: string;
  notes?: string;
  onFail?: {
    action: "redirect_dispose" | "report_reason";
    reasonPrompt?: string;
  };
  processSpeed?: string;
  processTemp?: number;
  requiresSignOff?: boolean;
  spreadsheet?: MiniSpreadsheet;
  tolerance?: number;
  type: StepType;
  unit?: string;
}

export interface RecipePhase {
  color: string;
  id: string;
  name: string;
  requiresSignOff?: boolean;
  steps: RecipeStep[];
}

export interface StepDependency {
  condition: "AND" | "OR";
  dependsOnStepKeys: string[];
  stepKey: string;
}

export interface AggregatedIngredient {
  _id: string;
  allergens: string[];
  insNumber?: string;
  isAdditive?: boolean;
  name: string;
  nearestExpiry: string | null;
  normalizedInsNumber?: string;
  stock: number;
  unit: string;
}

export interface TestResult {
  actualValue: number;
  max: number;
  method: string;
  min: number;
  parameter: string;
  targetRange: string;
  unit: string;
}

export type FormulationState = "Liquid" | "Solid";

// Enriched project with joined relations (from backend query)
export type BackendEnrichedProject = Exclude<
  FunctionReturnType<typeof api.projects.get>,
  null
>;

export interface EnrichedProject
  extends Omit<
    BackendEnrichedProject,
    "ingredients" | "phases" | "previousVersionIngredients"
  > {
  allergenRegion?: string;
  allergenReviewRequired?: boolean;
  batchWeight?: number;
  formulationState?: FormulationState;
  formulationAllergens?: string[];
  formulationExtraAllergens?: string[];
  ingredients: Ingredient[];
  phases?: RecipePhase[];
  previousVersionIngredients?: Ingredient[];
  yield?: number;
}

// Enriched lab report with joined results (from backend query)
export interface EnrichedLabReport extends LabReport {
  projectName: string;
  results: TestResult[];
}

// Enriched inventory item with computed usedIn (from backend query)
// Does not extend InventoryItem because backend enrichment adds computed fields
// with different shapes than the raw schema (e.g. usedIn is objects, not strings)
export type EnrichedInventoryItem = Omit<InventoryItem, "usedIn"> & {
  usedIn: { id: string; name: string }[];
  expiryStatus: string;
  expiryDays?: number;
};

// ─── Frontend-only types ─────────────────────────────────────
export const ProjectStatus = {
  DRAFT: "Draft",
  TESTING: "Testing",
  PROTOTYPE: "Prototype",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  RELEASED: "Released",
  ON_HOLD: "On Hold",
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export type StepType =
  | "weighing"
  | "timer"
  | "process"
  | "critical_check"
  | "conditional"
  | "spreadsheet_note";

export type SpreadsheetCellValue = string | number | boolean | null;

export interface MiniSpreadsheetCell {
  raw: string;
  value?: SpreadsheetCellValue;
  display?: string;
  formula?: string;
  error?: "ERROR" | "REF" | "CYCLE";
  updatedAt?: number;
  updatedBy?: string;
}

export interface MiniSpreadsheet {
  sheetKey: string;
  rows: number;
  cols: number;
  cells: Record<string, MiniSpreadsheetCell>;
  revision: number;
  updatedAt?: number;
  updatedBy?: string;
}
export type PhaseColor =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "rose"
  | "slate";

export interface LabTestResult {
  parameter: string;
  status: "pass" | "fail" | "pending";
  value: string;
}

export interface StatCardProps {
  alert?: boolean;
  icon?: React.ReactNode;
  label: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  value: string;
}

export type EquipmentStatus = "Available" | "In Use" | "Reserved";
export type TeamRole = "owner" | "admin" | "member";

// ─── Run Execution Types ─────────────────────────────────────

// Run-time step type – extends the formula RecipeStep with execution-only fields
export interface RunRecipeStep extends RecipeStep {
  actualWeight?: number;
  inputRequest?: { label: string; required: boolean };
  isCompleted: boolean;
  // Additional fields used in normalization or runtime
  qcParams?: {
    id: string;
    label: string;
    min: number;
    max: number;
    unit: string;
  }[];
}

export interface RunRecipePhase extends Omit<RecipePhase, "steps"> {
  steps: RunRecipeStep[];
  // Phases generated in runtime might not have all DB fields, but we align them as best as possible
}

// Data Structure for a Completed Run Log
export interface RunRecord {
  batchCode: string;
  data: Record<string, number>; // Mapping Step ID -> Actual Value
  durationString: string; // e.g., "14m 30s"
  endTime: Date;
  id: string;
  phases?: RunRecipePhase[];
  projectId: string;
  projectName: string;
  startTime: Date;
  status?: "completed" | "failed" | "In Progress";
}
