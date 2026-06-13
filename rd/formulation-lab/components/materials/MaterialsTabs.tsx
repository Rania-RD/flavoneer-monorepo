import { type HTMLMotionProps, motion } from "framer-motion";
import type { TFunction } from "i18next";
import type React from "react";

const MotionDiv = motion.div as React.FC<
  HTMLMotionProps<"div"> & {
    className?: string;
    layoutId?: string;
  }
>;

interface MaterialsTabsProps {
  activeTab: "current" | "library";
  onTabChange: (tab: "current" | "library") => void;
  t: TFunction;
}

export const MaterialsTabs = ({
  activeTab,
  onTabChange,
  t,
}: MaterialsTabsProps) => (
  <div className="flex space-x-2 border-gray-100 border-b rtl:space-x-reverse dark:border-slate-800">
    <button
      className={`relative px-4 pb-4 font-semibold text-sm transition-colors ${
        activeTab === "library"
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
      }`}
      onClick={() => onTabChange("library")}
    >
      {t("ingredient_library")}
      {activeTab === "library" && (
        <MotionDiv
          className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"
          layoutId="mats-tab"
        />
      )}
    </button>
    <button
      className={`relative px-4 pb-4 font-semibold text-sm transition-colors ${
        activeTab === "current"
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
      }`}
      onClick={() => onTabChange("current")}
    >
      {t("current_inventory")}
      {activeTab === "current" && (
        <MotionDiv
          className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"
          layoutId="mats-tab"
        />
      )}
    </button>
  </div>
);
