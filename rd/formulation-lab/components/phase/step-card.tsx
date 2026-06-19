import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import {
  CheckSquare,
  Clock,
  GripVertical,
  AlertTriangle,
  Lock,
  Plus,
  Scale,
  Settings,
  ShieldCheck,
  Table2,
  Trash2,
  Unlock,
} from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { MASS_UNITS } from "../../convex/units";
import type { Id } from "../../convex/_generated/dataModel";
import type { SpreadsheetFormulaContext } from "../../lib/spreadsheet/formula-engine";
import { calculateRegulationCompliance } from "../../lib/formulation/helpers";
import type {
  AggregatedIngredient,
  RecipeStep,
  StepDependency,
  StepType,
} from "../../types";
import { MiniSpreadsheetEditor } from "../spreadsheet/MiniSpreadsheetEditor";
import { ConditionalStepControls } from "./conditional-step-controls";
import { CriticalCheckControls } from "./critical-check-controls";
import { DependencyMenu } from "./dependency-menu";
import { IngredientInfoBanner } from "./ingredient-info-banner";
import type { AvailableDependencyStep, PhaseColorStyle } from "./types";

interface StepCardProps {
  activeDependencyMenu: string | null;
  additiveLimits?: Record<string, unknown>;
  aggregatedIngredients: AggregatedIngredient[];
  attributes: DraggableAttributes;
  colorStyle: PhaseColorStyle;
  dependency: StepDependency | undefined;
  isLocked: boolean;
  letter: string;
  listeners: DraggableSyntheticListeners | undefined;
  onDeleteStep: (stepId: string) => void;
  onAddStepAfter: (stepId: string, type: StepType) => void;
  onSaveDependency: (
    stepKey: string,
    dependsOn: string[],
    condition: "AND" | "OR"
  ) => void;
  onToggleDependencyMenu: (stepId: string) => void;
  onUpdateStep: (stepId: string, updates: Partial<RecipeStep>) => void;
  previousSteps: AvailableDependencyStep[];
  projectId?: Id<"projects">;
  readOnly: boolean;
  step: RecipeStep;
  stepIndex: number;
  formulationContext?: SpreadsheetFormulaContext;
  batchWeight: number;
}
const typeIcons: Record<StepType, React.ReactNode> = {
  weighing: <Scale size={16} />,
  timer: <Clock size={16} />,
  process: <Settings size={16} />,
  critical_check: <ShieldCheck size={16} />,
  conditional: <CheckSquare size={16} />,
  spreadsheet_note: <Table2 size={16} />,
};
export const StepCard = ({
  activeDependencyMenu,
  additiveLimits,
  aggregatedIngredients,
  attributes,
  colorStyle,
  dependency,
  isLocked,
  letter,
  listeners,
  onDeleteStep,
  onAddStepAfter,
  onSaveDependency,
  onToggleDependencyMenu,
  onUpdateStep,
  previousSteps,
  projectId,
  readOnly,
  step,
  stepIndex,
  formulationContext,
  batchWeight,
}: StepCardProps) => {
  const { t } = useTranslation();
  const stepIdStr = `${letter}${stepIndex + 1}`;
  const hasDependencies = dependency && dependency.dependsOnStepKeys.length > 0;
  const isDepMenuOpen = activeDependencyMenu === step.id;
  const selectedItem = aggregatedIngredients?.find(
    (item) => item._id === step.ingredientId
  );
  const additiveLimit = selectedItem?.isAdditive
    ? additiveLimits?.[selectedItem._id]
    : undefined;
  const regulationCompliance =
    step.type === "weighing"
      ? calculateRegulationCompliance({
          additiveLimit:
            additiveLimit && typeof additiveLimit === "object"
              ? additiveLimit
              : undefined,
          batchWeight,
          maxLimitPercent: step.maxLimitPercent,
          weight: step.expectedWeight || 0,
        })
      : undefined;
  const exceedsRegulationLimit = regulationCompliance?.exceedsLimit ?? false;
  const cardBorderClass = exceedsRegulationLimit
    ? ""
    : isLocked
      ? "border-amber-300 dark:border-amber-700/50"
      : "border-gray-200/50 dark:border-slate-700/50";

  const typeLabels: Record<StepType, string> = {
    weighing: t("weighing"),
    timer: t("timer"),
    process: t("process"),
    critical_check: t("critical_check_title"),
    conditional: t("conditional_pass_fail"),
    spreadsheet_note: t("spreadsheet_note"),
  };
  const dependencyButtonClass = hasDependencies
    ? "border-green-200 bg-green-50 text-green-600 dark:border-green-800/50 dark:bg-green-900/30"
    : "border-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800";
  const lockedDependencyButtonClass =
    "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800/50 dark:bg-amber-900/30";
  let dependencyIcon = <Unlock size={16} />;
  if (hasDependencies) {
    dependencyIcon = <CheckSquare size={16} />;
  }
  if (isLocked) {
    dependencyIcon = <Lock size={16} />;
  }

  let stepLabelText = t("check_title");
  if (step.type === "timer") {
    stepLabelText = t("timer_label");
  }
  if (step.type === "process") {
    stepLabelText = t("process_instruction");
  }
  return (
    <div
      className={`relative border p-4 ${
        exceedsRegulationLimit
          ? "border-red-300 bg-red-50 dark:border-red-800/60 dark:bg-red-950/20"
          : "bg-white dark:bg-slate-950"
      } ${cardBorderClass} transition-colors`}
    >
      <div className="mb-4 flex items-center gap-3">
        {!(readOnly || isLocked) && (
          <div
            className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-slate-500 dark:hover:text-slate-300"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={20} />
          </div>
        )}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center border border-black/5 font-semibold text-sm dark:border-white/5 ${colorStyle.bg} ${colorStyle.text} ${colorStyle.darkBg || ""} ${colorStyle.darkText || ""}`}
          >
            {stepIdStr}
          </div>
          <div className="flex items-center gap-1.5 border border-sky-200 bg-sky-50 px-2 py-1 font-semibold text-[10px] text-sky-700 uppercase tracking-widest dark:border-sky-800/30 dark:bg-sky-950/30 dark:text-sky-300">
            {typeIcons[step.type]} {typeLabels[step.type]}
          </div>
        </div>

        <div className="flex-1" />

        <div className="relative flex items-center gap-2">
          {!readOnly && previousSteps.length > 0 && (
            <button
              aria-label={t("configure_dependencies")}
              className={`flex items-center gap-1.5 border p-2 transition-colors ${isLocked ? lockedDependencyButtonClass : dependencyButtonClass}`}
              onClick={() => onToggleDependencyMenu(step.id)}
              title={t("configure_dependencies")}
              type="button"
            >
              {dependencyIcon}
              {hasDependencies && (
                <span className="font-bold text-xs">
                  {dependency?.dependsOnStepKeys.length}
                </span>
              )}
            </button>
          )}

          {!readOnly && step.type !== "weighing" && (
            <button
              aria-label={t("delete_step")}
              className="shrink-0 p-2 text-gray-400 transition-colors hover:text-red-500"
              onClick={() => onDeleteStep(step.id)}
              title={t("delete_step")}
              type="button"
            >
              <Trash2 size={16} />
            </button>
          )}

          <DependencyMenu
            dependency={dependency}
            isOpen={isDepMenuOpen}
            onSaveDependency={onSaveDependency}
            previousSteps={previousSteps}
            stepId={step.id}
          />
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-4 transition-opacity duration-300 lg:grid-cols-2 ${isLocked ? "pointer-events-none opacity-50" : ""}`}
      >
        {!(step.type === "weighing" || step.type === "spreadsheet_note") && (
          <div className="space-y-1.5">
            <label
              className="block cursor-pointer px-1 font-semibold text-[10px] text-gray-500 uppercase tracking-wider dark:text-slate-400"
              htmlFor={`step-label-${step.id}`}
            >
              {stepLabelText}
            </label>
            <input
              className="enterprise-input w-full"
              disabled={readOnly}
              id={`step-label-${step.id}`}
              name={`stepLabel-${step.id}`}
              onChange={(event) =>
                onUpdateStep(step.id, {
                  label: event.target.value,
                })
              }
              placeholder={
                step.type === "process"
                  ? t("example_mix_until_dissolved")
                  : t("label")
              }
              type="text"
              value={step.label}
            />
          </div>
        )}

        {step.type === "weighing" && (
          <>
            <div className="space-y-1.5">
              <label
                className="block cursor-pointer px-1 font-semibold text-[10px] text-gray-500 uppercase tracking-wider dark:text-slate-400"
                htmlFor={`ingredient-select-${step.id}`}
              >
                {t("linked_inventory_item")}
              </label>
              <select
                className="enterprise-input w-full"
                data-testid="step-ingredient-select"
                disabled={readOnly}
                id={`ingredient-select-${step.id}`}
                name={`ingredientId-${step.id}`}
                onChange={(event) => {
                  const ingredientItem = aggregatedIngredients?.find(
                    (item) => item._id === event.target.value
                  );
                  onUpdateStep(step.id, {
                    ingredientId: event.target.value,
                    label: ingredientItem
                      ? t("add_ingredient_step_label", {
                          name: ingredientItem.name,
                        })
                      : t("weighing"),
                    unit: ingredientItem?.unit || step.unit || "g",
                  });
                }}
                value={step.ingredientId || ""}
              >
                <option disabled value="">
                  {t("select_ingredient_library")}
                </option>
                {aggregatedIngredients?.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                className="block cursor-pointer px-1 font-bold text-[10px] text-gray-500 uppercase tracking-wider dark:text-slate-400"
                htmlFor={`target-qty-${step.id}`}
              >
                {t("target_quantity")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="enterprise-input w-full font-semibold"
                  data-testid="step-target-quantity-input"
                  disabled={readOnly}
                  id={`target-qty-${step.id}`}
                  name={`expectedWeight-${step.id}`}
                  onChange={(event) =>
                    onUpdateStep(step.id, {
                      expectedWeight:
                        Number.parseFloat(event.target.value) || 0,
                    })
                  }
                  placeholder={t("placeholder_0")}
                  type="number"
                  value={step.expectedWeight}
                />
                <select
                  aria-label={t("unit_for_step", { stepId: step.id })}
                  className="enterprise-input w-20 cursor-pointer font-semibold"
                  disabled={readOnly}
                  name={`unit-${step.id}`}
                  onChange={(event) =>
                    onUpdateStep(step.id, {
                      unit: event.target.value,
                    })
                  }
                  value={step.unit || "g"}
                >
                  {MASS_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                {!readOnly && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      aria-label={t("add_ingredient_row")}
                      className="border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                      data-testid="add-ingredient-row-button"
                      onClick={() => onAddStepAfter(step.id, "weighing")}
                      title={t("add_ingredient_row")}
                      type="button"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      aria-label={t("delete_ingredient_row")}
                      className="border border-red-200 bg-red-50 p-2.5 text-red-600 transition-colors hover:bg-red-100 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                      data-testid="delete-ingredient-row-button"
                      onClick={() => onDeleteStep(step.id)}
                      title={t("delete_ingredient_row")}
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                className="block cursor-pointer px-1 font-bold text-[10px] text-gray-500 uppercase tracking-wider dark:text-slate-400"
                htmlFor={`max-limit-${step.id}`}
              >
                {t("max_limit_percent")}
              </label>
              <input
                className={`w-full border bg-white px-4 py-2.5 font-semibold text-gray-900 text-md transition-colors focus:outline-none focus:ring-1 dark:bg-slate-950 dark:text-white ${
                  exceedsRegulationLimit
                    ? "border-red-300 focus:ring-red-500 dark:border-red-700"
                    : "border-gray-200 focus:ring-blue-500 dark:border-slate-700"
                }`}
                disabled={readOnly}
                id={`max-limit-${step.id}`}
                min="0"
                name={`maxLimitPercent-${step.id}`}
                onChange={(event) =>
                  onUpdateStep(step.id, {
                    maxLimitPercent:
                      event.target.value === ""
                        ? undefined
                        : Number.parseFloat(event.target.value),
                  })
                }
                placeholder={
                  regulationCompliance?.effectiveMaxLimitPercent !== undefined
                    ? regulationCompliance.effectiveMaxLimitPercent.toFixed(4)
                    : "0"
                }
                step="any"
                type="number"
                value={step.maxLimitPercent ?? ""}
              />
            </div>

            <div className="space-y-1.5">
              <span className="block px-1 font-bold text-[10px] text-gray-500 uppercase tracking-wider dark:text-slate-400">
                {t("actual_percent")}
              </span>
              <div
                className={`border px-4 py-2.5 font-semibold text-md ${
                  exceedsRegulationLimit
                    ? "border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200"
                    : "border-gray-200 bg-gray-50 text-gray-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
                data-testid="ingredient-actual-percent"
              >
                {regulationCompliance?.actualPercent.toFixed(3) ?? "0.000"}%
              </div>
            </div>

            <IngredientInfoBanner
              additiveLimit={additiveLimit}
              expectedWeight={step.expectedWeight}
              selectedItem={selectedItem}
            />
            {exceedsRegulationLimit && (
              <div className="flex items-center gap-2 border border-red-200 bg-red-100 px-4 py-3 font-semibold text-red-700 text-sm lg:col-span-2 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                <AlertTriangle size={18} />
                {t("exceeds_regulation_limit")}
              </div>
            )}
          </>
        )}

        {step.type === "timer" && (
          <div className="space-y-1.5">
            <label
              className="block cursor-pointer px-1 font-bold text-[10px] text-gray-500 uppercase tracking-wider dark:text-slate-400"
              htmlFor={`duration-${step.id}`}
            >
              {t("duration_seconds")}
            </label>
            <div className="flex items-center gap-2">
              <input
                className="enterprise-input w-full font-semibold"
                disabled={readOnly}
                id={`duration-${step.id}`}
                name={`durationSeconds-${step.id}`}
                onChange={(event) =>
                  onUpdateStep(step.id, {
                    durationSeconds:
                      Number.parseInt(event.target.value, 10) || 0,
                  })
                }
                placeholder={t("placeholder_60")}
                type="number"
                value={step.durationSeconds || ""}
              />
            </div>
          </div>
        )}

        {step.type === "process" && (
          <>
            <div className="space-y-1.5">
              <label
                className="block cursor-pointer px-1 font-bold text-[10px] text-gray-500 uppercase tracking-wider dark:text-slate-400"
                htmlFor={`process-temp-${step.id}`}
              >
                {t("process_temp_c")}
              </label>
              <input
                className="enterprise-input w-full font-semibold"
                disabled={readOnly}
                id={`process-temp-${step.id}`}
                name={`processTemp-${step.id}`}
                onChange={(event) =>
                  onUpdateStep(step.id, {
                    processTemp: Number.parseFloat(event.target.value) || 0,
                  })
                }
                placeholder={t("example_75")}
                type="number"
                value={step.processTemp || ""}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="block cursor-pointer px-1 font-bold text-[10px] text-gray-500 uppercase tracking-wider dark:text-slate-400"
                htmlFor={`process-speed-${step.id}`}
              >
                {t("process_speed_rpm_hz")}
              </label>
              <input
                className="enterprise-input w-full font-semibold"
                disabled={readOnly}
                id={`process-speed-${step.id}`}
                name={`processSpeed-${step.id}`}
                onChange={(event) =>
                  onUpdateStep(step.id, {
                    processSpeed: event.target.value,
                  })
                }
                placeholder={t("example_1200_rpm")}
                type="text"
                value={step.processSpeed || ""}
              />
            </div>
          </>
        )}

        {step.type === "critical_check" && (
          <CriticalCheckControls
            onUpdateStep={onUpdateStep}
            readOnly={readOnly}
            step={step}
          />
        )}

        {step.type === "conditional" && (
          <ConditionalStepControls
            onUpdateStep={onUpdateStep}
            readOnly={readOnly}
            step={step}
          />
        )}

        {step.type === "spreadsheet_note" && (
          <MiniSpreadsheetEditor
            formulationContext={formulationContext}
            onLocalStepUpdate={onUpdateStep}
            projectId={projectId}
            readOnly={readOnly}
            step={step}
          />
        )}
      </div>
    </div>
  );
};
