import { AnimatePresence } from "framer-motion";
import { AlertCircle, Share2 } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";
import type { IngredientDependencyData } from "../types";

interface DependencyWarningModalProps {
  dependencies: IngredientDependencyData | null;
  isOpen: boolean;
  isUpdating: boolean;
  onClose: () => void;
  onIgnore: () => void;
  onUpdate: () => void;
}

const DependencyWarningModal: React.FC<DependencyWarningModalProps> = ({
  isOpen,
  onIgnore,
  onUpdate,
  dependencies,
  isUpdating,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useSettings();

  if (!dependencies) {
    return null;
  }

  const hasComposites = dependencies.composites.length > 0;
  const hasFormulas = dependencies.formulas.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm dark:bg-black/60"
            exit="exit"
            initial="hidden"
            variants={overlayVariants}
          />

          <MotionDiv
            animate="visible"
            className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-[#1e293b]"
            exit="exit"
            initial="hidden"
            variants={modalVariants}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-amber-200/50 border-b bg-amber-50 p-8 dark:border-amber-900/30 dark:bg-amber-900/10">
              <div
                className={`flex items-center ${isRTL ? "space-x-4 space-x-reverse" : "space-x-4"}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-amber-500 text-white shadow-amber-500/20 shadow-lg">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-xl leading-tight dark:text-white">
                    {t("out_of_sync")}
                  </h2>
                  <p className="font-medium text-amber-700 text-sm dark:text-amber-500">
                    {t("dependency_warning_desc")}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
              <p className="mb-6 font-medium text-gray-600 dark:text-slate-300">
                {t("dependency_impact_message")}
              </p>

              <div className="space-y-6">
                {hasComposites && (
                  <div>
                    <h3 className="mb-3 font-bold text-gray-900 text-sm uppercase tracking-wider dark:text-white">
                      {t("composite_ingredients")}{" "}
                      ({dependencies.composites.length})
                    </h3>
                    <ul className="space-y-2">
                      {dependencies.composites.map((comp) => (
                        <li
                          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50"
                          key={comp._id}
                        >
                          <Share2 className="text-gray-400" size={16} />
                          <span className="font-semibold text-gray-700 dark:text-slate-200">
                            {comp.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {hasFormulas && (
                  <div>
                    <h3 className="mb-3 font-bold text-gray-900 text-sm uppercase tracking-wider dark:text-white">
                      {t("formulas")} (
                      {dependencies.formulas.length})
                    </h3>
                    <ul className="space-y-2">
                      {dependencies.formulas.map((form) => (
                        <li
                          className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 dark:border-indigo-900/30 dark:bg-indigo-900/10"
                          key={form._id}
                        >
                          <Share2 className="text-indigo-400" size={16} />
                          <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                            {form.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 font-medium text-gray-500 text-xs">
                      {t("formula_warning")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-gray-100 border-t bg-gray-50 px-8 py-6 dark:border-slate-700 dark:bg-slate-800/50">
              <button
                className="rounded-[1.2rem] px-6 py-3 font-bold text-gray-500 text-sm transition-colors hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                disabled={isUpdating}
                onClick={onIgnore}
                type="button"
              >
                {t("ignore_and_save")}
              </button>

              <button
                className="flex items-center gap-2 rounded-[1.2rem] bg-amber-500 px-8 py-3 font-bold text-sm text-white shadow-amber-500/20 shadow-lg transition-all hover:bg-amber-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isUpdating}
                onClick={onUpdate}
                type="button"
              >
                {isUpdating ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  t("update_dependencies")
                )}
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DependencyWarningModal;
