import { ChevronLeft, ChevronRight, FlaskConical, Save, X } from "lucide-react";
import type React from "react";

interface HeaderProps {
  isRTL: boolean;
  onClose: () => void;
  subtitle: React.ReactNode;
  title: React.ReactNode;
}

export const AddIngredientModalHeader = ({
  isRTL,
  onClose,
  subtitle,
  title,
}: HeaderProps) => (
  <div className="flex items-center justify-between border-gray-100 border-b bg-[#FAF5F0] p-8 dark:border-slate-700 dark:bg-[#1e293b]">
    <div
      className={`flex items-center ${isRTL ? "space-x-4 space-x-reverse" : "space-x-4"}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-indigo-600 text-white shadow-indigo-600/20 shadow-lg">
        <FlaskConical size={24} />
      </div>
      <div>
        <h2 className="font-bold text-2xl text-gray-900 leading-tight dark:text-white">
          {title}
        </h2>
        <p className="font-medium text-gray-500 text-sm dark:text-slate-400">
          {subtitle}
        </p>
      </div>
    </div>
    <button
      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
      onClick={onClose}
      type="button"
    >
      <X size={20} />
    </button>
  </div>
);

interface TabsProps {
  activeTab: "info" | "nutrients";
  generalInfoLabel: React.ReactNode;
  isRTL: boolean;
  nutritionalDataLabel: React.ReactNode;
  setActiveTab: (tab: "info" | "nutrients") => void;
}

export const AddIngredientModalTabs = ({
  activeTab,
  generalInfoLabel,
  isRTL,
  nutritionalDataLabel,
  setActiveTab,
}: TabsProps) => (
  <div className="px-8 pt-6">
    <div
      className={`flex items-center ${isRTL ? "space-x-1 space-x-reverse" : "space-x-1"} border-gray-200 border-b dark:border-slate-700`}
    >
      <button
        className={`border-b-2 px-4 pb-3 font-bold text-sm uppercase tracking-wide transition-colors ${
          activeTab === "info"
            ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
            : "border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
        }`}
        onClick={() => setActiveTab("info")}
        type="button"
      >
        1. {generalInfoLabel}
      </button>
      <button
        className={`border-b-2 px-4 pb-3 font-bold text-sm uppercase tracking-wide transition-colors ${
          activeTab === "nutrients"
            ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
            : "border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
        }`}
        onClick={() => setActiveTab("nutrients")}
        type="button"
      >
        2. {nutritionalDataLabel}
      </button>
    </div>
  </div>
);

interface FooterProps {
  activeTab: "info" | "nutrients";
  canSubmit: boolean;
  cancelLabel: React.ReactNode;
  isLocked: boolean;
  isRTL: boolean;
  isSubmitting: boolean;
  nextLabel: React.ReactNode;
  onCancel: () => void;
  onNext: (event?: React.MouseEvent) => void;
  onPrevious: (event?: React.MouseEvent) => void;
  previousLabel: React.ReactNode;
  saveLabel: React.ReactNode;
}

export const AddIngredientModalFooter = ({
  activeTab,
  canSubmit,
  cancelLabel,
  isLocked,
  isRTL,
  isSubmitting,
  nextLabel,
  onCancel,
  onNext,
  onPrevious,
  previousLabel,
  saveLabel,
}: FooterProps) => (
  <div className="flex items-center justify-between border-gray-100 border-t bg-gray-50 px-8 py-6 dark:border-slate-700 dark:bg-slate-800/50">
    <button
      className="flex items-center rounded-[1.2rem] px-6 py-3 font-bold text-gray-500 text-sm transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:text-slate-200"
      disabled={activeTab === "info"}
      onClick={onPrevious}
      type="button"
    >
      <ChevronLeft
        className={isRTL ? "ms-1 -scale-x-100 transform" : "me-1"}
        size={16}
      />
      {previousLabel}
    </button>

    <div className="flex items-center gap-4">
      <button
        className="rounded-[1.2rem] px-6 py-3 font-bold text-gray-500 text-sm transition-colors hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
        onClick={onCancel}
        type="button"
      >
        {cancelLabel}
      </button>

      {!isLocked && (
        <>
          {activeTab !== "nutrients" ? (
            <button
              className="flex items-center gap-2 rounded-[1.2rem] bg-gray-900 px-8 py-3 font-bold text-sm text-white shadow-gray-900/20 shadow-lg transition-all hover:bg-gray-800 active:scale-95 dark:bg-indigo-600 dark:shadow-indigo-600/20 dark:hover:bg-indigo-500"
              onClick={onNext}
              type="button"
            >
              {nextLabel}
              <ChevronRight
                className={isRTL ? "me-1 -scale-x-100 transform" : "ms-1"}
                size={16}
              />
            </button>
          ) : (
            <button
              className="flex items-center gap-2 rounded-[1.2rem] bg-gray-900 px-8 py-3 font-bold text-sm text-white shadow-gray-900/20 shadow-lg transition-all hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-600 dark:shadow-indigo-600/20 dark:hover:bg-indigo-500"
              disabled={isSubmitting || !canSubmit}
              form="add-ingredient-form"
              type="submit"
            >
              {isSubmitting ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Save size={18} />
                  {saveLabel}
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  </div>
);
