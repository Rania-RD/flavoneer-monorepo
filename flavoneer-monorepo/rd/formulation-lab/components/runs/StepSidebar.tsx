import { Check } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import type { RunRecipePhase } from "../../types";

interface StepSidebarProps {
  activePhaseIndex: number;
  activeStepIndex?: number;
  onPhaseSelect: (index: number) => void;
  onStepSelect?: (index: number) => void;
  phases: RunRecipePhase[];
}

const StepSidebar: React.FC<StepSidebarProps> = ({
  phases,
  activePhaseIndex,
  activeStepIndex = 0,
  onPhaseSelect,
  onStepSelect,
}) => {
  const { t } = useTranslation();
  const alphabetMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return (
    <div className="flex w-full flex-col gap-2 md:w-64">
      {phases.map((phase, pIndex) => {
        const isPhaseActive = pIndex === activePhaseIndex;
        const isPhaseCompleted = pIndex < activePhaseIndex;
        const isPhaseLocked = pIndex > activePhaseIndex;

        const phaseIdStr = alphabetMap[pIndex % 26];

        return (
          <div className="flex flex-col gap-1" key={phase.id}>
            <div
              className={`relative cursor-pointer rounded-xl border-2 p-3 transition-all duration-300 ${
                isPhaseActive
                  ? "border-indigo-500 bg-white shadow-md dark:bg-slate-800"
                  : isPhaseCompleted
                    ? "border-transparent bg-indigo-50 text-indigo-600 dark:bg-indigo-900/10"
                    : "pointer-events-none border-transparent bg-gray-50 text-gray-400 opacity-60 dark:bg-slate-900"
              }`}
              onClick={() => !isPhaseLocked && onPhaseSelect(pIndex)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg font-bold text-xs ${
                    isPhaseActive
                      ? "bg-indigo-500 text-white"
                      : isPhaseCompleted
                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                        : "bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {isPhaseCompleted ? <Check size={14} /> : phaseIdStr}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 font-bold text-[10px] uppercase tracking-wider opacity-80">
                    {t("phase")} {phaseIdStr}
                  </p>
                  <p className="truncate font-semibold text-sm leading-tight">
                    {phase.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Render Steps within the Phase */}
            {isPhaseActive && phase.steps && phase.steps.length > 0 && (
              <div className="my-1 ms-5 flex flex-col gap-1 border-indigo-100 border-s-2 ps-4 dark:border-indigo-900/30">
                {phase.steps.map((step, sIndex) => {
                  const isStepActive =
                    isPhaseActive && sIndex === activeStepIndex;
                  const isStepCompleted =
                    isPhaseCompleted ||
                    (isPhaseActive && sIndex < activeStepIndex);
                  const isStepLocked =
                    isPhaseLocked ||
                    (isPhaseActive && sIndex > activeStepIndex);

                  return (
                    <div
                      className={`relative flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-all duration-200 ${
                        isStepActive
                          ? "bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
                          : isStepCompleted
                            ? "text-indigo-600 opacity-70 hover:opacity-100 dark:text-indigo-400"
                            : "pointer-events-none text-gray-400 opacity-60 dark:text-slate-500"
                      }`}
                      key={step.id}
                      onClick={() =>
                        !isStepLocked &&
                        isPhaseActive &&
                        onStepSelect &&
                        onStepSelect(sIndex)
                      }
                    >
                      <div
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          isStepActive
                            ? "bg-indigo-500 ring-4 ring-indigo-200 dark:ring-indigo-900/50"
                            : isStepCompleted
                              ? "bg-indigo-400"
                              : "bg-gray-300 dark:bg-slate-600"
                        }`}
                      />
                      <span className="truncate text-xs">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepSidebar;
