import { AnimatePresence } from "framer-motion";
import {
  CheckSquare,
  Clock,
  Plus,
  Scale,
  Settings,
  ShieldCheck,
  Table2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { dropdownVariants, MotionDiv } from "../../lib/animations";
import type { StepType } from "../../types";

interface AddStepMenuProps {
  isOpen: boolean;
  onAddStep: (type: StepType) => void;
  onToggle: () => void;
}

export const AddStepMenu = ({
  isOpen,
  onAddStep,
  onToggle,
}: AddStepMenuProps) => {
  const { t } = useTranslation();

  return (
    <div className="relative z-0 pt-2">
      <button
        className="flex w-full items-center justify-center gap-2 border border-slate-300 border-dashed bg-white px-4 py-3 font-semibold text-slate-600 text-sm transition-colors hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-sky-800 dark:hover:bg-sky-950/30 dark:hover:text-sky-300"
        data-testid="add-content-button"
        onClick={onToggle}
        type="button"
      >
        <Plus size={18} /> {isOpen ? t("cancel") : t("add_content")}
      </button>

      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            animate="visible"
            className="absolute start-0 top-full z-[100] mt-2 w-full origin-top overflow-hidden border border-slate-300 bg-white shadow-none dark:border-slate-700 dark:bg-slate-950"
            exit="exit"
            initial="hidden"
            variants={dropdownVariants}
          >
            <div className="space-y-1 p-2">
              <button
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"
                data-testid="add-step-weighing-button"
                onClick={() => onAddStep("weighing")}
                type="button"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Scale size={16} />
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm dark:text-white">
                    {t("weighing")}
                  </div>
                  <div className="text-gray-500 text-xs dark:text-slate-400">
                    {t("add_an_ingredient_with_target_mass")}
                  </div>
                </div>
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"
                onClick={() => onAddStep("timer")}
                type="button"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <Clock size={16} />
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm dark:text-white">
                    {t("timer")}
                  </div>
                  <div className="text-gray-500 text-xs dark:text-slate-400">
                    {t("time_based_instruction")}
                  </div>
                </div>
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"
                onClick={() => onAddStep("process")}
                type="button"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                  <Settings size={16} />
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm dark:text-white">
                    {t("process")}
                  </div>
                  <div className="text-gray-500 text-xs dark:text-slate-400">
                    {t("general_instruction_or_mixer_control")}
                  </div>
                </div>
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"
                onClick={() => onAddStep("critical_check")}
                type="button"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm dark:text-white">
                    {t("critical_check_title")}
                  </div>
                  <div className="text-gray-500 text-xs dark:text-slate-400">
                    {t("qc_parameter_and_limits_validation")}
                  </div>
                </div>
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                onClick={() => onAddStep("conditional")}
                type="button"
              >
                <div className="flex h-8 w-8 items-center justify-center border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-400">
                  <CheckSquare size={16} />
                </div>
                <div>
                  <div className="font-bold text-indigo-700 text-sm dark:text-indigo-300">
                    {t("conditional_pass_fail")}
                  </div>
                  <div className="text-indigo-500/80 text-xs dark:text-indigo-400/80">
                    {t("branch_execution_on_a_yes_no_validation")}
                  </div>
                </div>
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start transition-colors hover:bg-teal-50 dark:hover:bg-teal-900/30"
                data-testid="add-step-spreadsheet-button"
                onClick={() => onAddStep("spreadsheet_note")}
                type="button"
              >
                <div className="flex h-8 w-8 items-center justify-center border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800/50 dark:bg-teal-950/30 dark:text-teal-400">
                  <Table2 size={16} />
                </div>
                <div>
                  <div className="font-bold text-sm text-teal-700 dark:text-teal-300">
                    {t("spreadsheet_note")}
                  </div>
                  <div className="text-teal-500/80 text-xs dark:text-teal-400/80">
                    {t("spreadsheet_note_description")}
                  </div>
                </div>
              </button>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
