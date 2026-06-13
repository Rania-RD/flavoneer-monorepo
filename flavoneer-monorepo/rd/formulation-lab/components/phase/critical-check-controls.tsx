import { useTranslation } from "react-i18next";
import type { RecipeStep } from "../../types";

interface CriticalCheckControlsProps {
  onUpdateStep: (stepId: string, updates: Partial<RecipeStep>) => void;
  readOnly: boolean;
  step: RecipeStep;
}

export const CriticalCheckControls = ({
  onUpdateStep,
  readOnly,
  step,
}: CriticalCheckControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5">
      <label
        className="block cursor-pointer px-1 font-bold text-[10px] text-gray-500 uppercase tracking-wider dark:text-slate-400"
        htmlFor={`crit-name-${step.id}`}
      >
        {t("critical_parameter_e_g_ph_brix")}
      </label>
      <input
        className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-900 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-[#0f172a] dark:text-white"
        disabled={readOnly}
        id={`crit-name-${step.id}`}
        name={`criticalParamsName-${step.id}`}
        onChange={(event) =>
          onUpdateStep(step.id, {
            criticalParams: [
              {
                name: event.target.value,
                min: step.criticalParams?.[0]?.min,
                max: step.criticalParams?.[0]?.max,
                unit: step.criticalParams?.[0]?.unit,
              },
            ],
          })
        }
        placeholder={t("example_ph_level")}
        type="text"
        value={step.criticalParams?.[0]?.name || ""}
      />
      <div className="flex gap-2">
        <input
          aria-label={t("minimum_value_for_parameter", {
            stepId: step.id,
          })}
          className="w-1/2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-[#0f172a]"
          disabled={readOnly}
          name={`criticalParamsMin-${step.id}`}
          onChange={(event) =>
            onUpdateStep(step.id, {
              criticalParams: [
                {
                  ...step.criticalParams?.[0],
                  name: step.criticalParams?.[0]?.name || "",
                  min: Number.parseFloat(event.target.value) || undefined,
                },
              ],
            })
          }
          placeholder={t("min_val")}
          type="number"
          value={step.criticalParams?.[0]?.min ?? ""}
        />
        <input
          aria-label={t("maximum_value_for_parameter", {
            stepId: step.id,
          })}
          className="w-1/2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-[#0f172a]"
          disabled={readOnly}
          name={`criticalParamsMax-${step.id}`}
          onChange={(event) =>
            onUpdateStep(step.id, {
              criticalParams: [
                {
                  ...step.criticalParams?.[0],
                  name: step.criticalParams?.[0]?.name || "",
                  max: Number.parseFloat(event.target.value) || undefined,
                },
              ],
            })
          }
          placeholder={t("max_val")}
          type="number"
          value={step.criticalParams?.[0]?.max ?? ""}
        />
      </div>
      <label
        className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-gray-700 text-sm dark:text-slate-300"
        htmlFor={`signoff-${step.id}`}
      >
        <input
          checked={step.requiresSignOff}
          className="rounded border border-gray-300 bg-white text-blue-600 focus:ring-blue-500"
          disabled={readOnly}
          id={`signoff-${step.id}`}
          name={`requiresSignOff-${step.id}`}
          onChange={(event) =>
            onUpdateStep(step.id, {
              requiresSignOff: event.target.checked,
            })
          }
          type="checkbox"
        />
        <span className="font-medium">{t("requires_sign_off")}</span>
      </label>
    </div>
  );
};
