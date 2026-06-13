import { CheckSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RecipeStep } from "../../types";

interface ConditionalStepControlsProps {
  onUpdateStep: (stepId: string, updates: Partial<RecipeStep>) => void;
  readOnly: boolean;
  step: RecipeStep;
}

export const ConditionalStepControls = ({
  onUpdateStep,
  readOnly,
  step,
}: ConditionalStepControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="col-span-1 mt-2 space-y-3 border-indigo-100 border-t pt-4 lg:col-span-2 dark:border-indigo-800/30">
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
          <CheckSquare size={16} />
        </div>
        <h4 className="font-bold text-indigo-900 text-sm dark:text-indigo-100">
          {t("quality_control_condition")}
        </h4>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 dark:border-green-800/50 dark:bg-green-900/10">
          <div className="mb-2 font-bold text-green-700 text-xs uppercase tracking-wider dark:text-green-500">
            {t("if_pass_yes")}
          </div>
          <div className="flex items-center gap-2 font-medium text-green-800 text-sm dark:text-green-400">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            {t("proceed_to_next_step")}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-800/50 dark:bg-red-900/10">
          <div className="font-bold text-red-700 text-xs uppercase tracking-wider dark:text-red-500">
            {t("if_fail_no")}
          </div>

          <div className="space-y-1.5">
            <label
              className="font-bold text-gray-700 text-xs dark:text-slate-300"
              htmlFor={`fail-action-${step.id}`}
            >
              {t("failure_action")}
            </label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-800"
              disabled={readOnly}
              id={`fail-action-${step.id}`}
              name={`failAction-${step.id}`}
              onChange={(event) =>
                onUpdateStep(step.id, {
                  onFail: {
                    action: event.target.value as
                      | "redirect_dispose"
                      | "report_reason",
                    reasonPrompt: step.onFail?.reasonPrompt,
                  },
                })
              }
              value={step.onFail?.action || "report_reason"}
            >
              <option value="report_reason">
                {t("request_failure_reason")}
              </option>
              <option value="redirect_dispose">
                {t("mandatory_batch_disposal")}
              </option>
            </select>
          </div>

          {step.onFail?.action === "report_reason" && (
            <div className="space-y-1.5 pt-1">
              <label
                className="font-bold text-gray-700 text-xs dark:text-slate-300"
                htmlFor={`fail-prompt-${step.id}`}
              >
                {t("reason_prompt_message")}
              </label>
              <input
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-800"
                disabled={readOnly}
                id={`fail-prompt-${step.id}`}
                name={`failPrompt-${step.id}`}
                onChange={(event) =>
                  onUpdateStep(step.id, {
                    onFail: {
                      action: step.onFail?.action || "report_reason",
                      reasonPrompt: event.target.value,
                    },
                  })
                }
                placeholder={t("example_failure_reason")}
                type="text"
                value={step.onFail?.reasonPrompt || ""}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
