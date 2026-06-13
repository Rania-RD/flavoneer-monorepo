import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { dropdownVariants, MotionDiv } from "../../lib/animations";
import type { StepDependency } from "../../types";
import type { AvailableDependencyStep } from "./types";

interface DependencyMenuProps {
  dependency: StepDependency | undefined;
  isOpen: boolean;
  onSaveDependency: (
    stepKey: string,
    dependsOn: string[],
    condition: "AND" | "OR"
  ) => void;
  previousSteps: AvailableDependencyStep[];
  stepId: string;
}

export const DependencyMenu = ({
  dependency,
  isOpen,
  onSaveDependency,
  previousSteps,
  stepId,
}: DependencyMenuProps) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          animate="visible"
          className="absolute end-0 top-full z-50 mt-2 w-72 origin-top-end rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-[#1e293b]"
          exit="exit"
          initial="hidden"
          variants={dropdownVariants}
        >
          <h4 className="mb-3 font-bold text-gray-900 text-sm dark:text-white">
            {t("dependencies")}
          </h4>

          <div className="mb-4 max-h-48 space-y-2 overflow-y-auto pe-1">
            {previousSteps.map((previousStep) => {
              const isChecked =
                dependency?.dependsOnStepKeys.includes(previousStep.key) ??
                false;

              return (
                <label
                  className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
                  htmlFor={`dep-${stepId}-${previousStep.key}`}
                  key={previousStep.key}
                >
                  <input
                    checked={isChecked}
                    className="mt-1"
                    id={`dep-${stepId}-${previousStep.key}`}
                    name={`dependency-${stepId}-${previousStep.key}`}
                    onChange={(event) => {
                      const nextDependency = dependency || {
                        stepKey: stepId,
                        dependsOnStepKeys: [],
                        condition: "AND" as const,
                      };
                      let newKeys = [...nextDependency.dependsOnStepKeys];

                      if (event.target.checked) {
                        newKeys.push(previousStep.key);
                      } else {
                        newKeys = newKeys.filter(
                          (key) => key !== previousStep.key
                        );
                      }

                      onSaveDependency(
                        stepId,
                        newKeys,
                        nextDependency.condition
                      );
                    }}
                    type="checkbox"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-gray-700 text-xs dark:text-slate-300">
                      {t("phase")} {previousStep.phaseLetter} {t("step")}{" "}
                      {previousStep.stepNumber}
                    </div>
                    <div className="w-48 truncate text-gray-500 text-xs">
                      {previousStep.label}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-gray-100 border-t pt-3 dark:border-slate-800">
            <label
              className="cursor-pointer font-bold text-gray-500 text-xs"
              htmlFor={`cond-${stepId}`}
            >
              {t("condition_logic")}
            </label>
            <select
              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-bold text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
              id={`cond-${stepId}`}
              name={`conditionLogic-${stepId}`}
              onChange={(event) => {
                const nextDependency = dependency || {
                  stepKey: stepId,
                  dependsOnStepKeys: [],
                  condition: "AND" as const,
                };

                onSaveDependency(
                  stepId,
                  nextDependency.dependsOnStepKeys,
                  event.target.value as "AND" | "OR"
                );
              }}
              value={dependency?.condition || "AND"}
            >
              <option value="AND">{t("and_all")}</option>
              <option value="OR">{t("or_any")}</option>
            </select>
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};
