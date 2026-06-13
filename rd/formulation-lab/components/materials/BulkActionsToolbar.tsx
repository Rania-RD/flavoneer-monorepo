import { type HTMLMotionProps, motion } from "framer-motion";
import type { TFunction } from "i18next";
import { Download, Trash2, X } from "lucide-react";
import type React from "react";

const MotionDiv = motion.div as React.FC<
  HTMLMotionProps<"div"> & {
    className?: string;
    children?: React.ReactNode;
  }
>;

interface BulkActionsToolbarProps {
  isDeleting: boolean;
  isUpdatingStatus: boolean;
  onClearSelection: () => void;
  onDelete: () => void;
  onExport: () => void;
  onStatusChange: (status: "ok" | "low") => void;
  selectedCount: number;
  t: TFunction;
}

export const BulkActionsToolbar = ({
  isDeleting,
  isUpdatingStatus,
  onClearSelection,
  onDelete,
  onExport,
  onStatusChange,
  selectedCount,
  t,
}: BulkActionsToolbarProps) => (
  <MotionDiv
    animate={{ y: 0, opacity: 1 }}
    className="fixed start-1/2 bottom-8 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-gray-800 bg-gray-900 px-6 py-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
    exit={{ y: 100, opacity: 0 }}
    initial={{ y: 100, opacity: 0 }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
  >
    <div className="flex items-center gap-3 border-gray-700 border-e pe-4 text-white dark:border-slate-600">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 font-bold text-xs">
        {selectedCount}
      </span>
      <span className="font-semibold text-sm">{t("selected")}</span>
    </div>

    <div className="flex items-center gap-2">
      <button
        className="flex items-center gap-2 rounded-full px-4 py-2 font-medium text-gray-200 text-sm transition-colors hover:bg-white/10 hover:text-white"
        onClick={onExport}
      >
        <Download size={16} /> {t("export")}
      </button>

      <div className="hidden items-center gap-2 border-gray-700 border-s ps-2 sm:flex dark:border-slate-600">
        <span className="px-2 font-medium text-gray-400 text-xs">
          {t("set_status")}
        </span>
        <button
          className="rounded-full bg-emerald-400/10 px-3 py-1.5 font-semibold text-emerald-400 text-xs transition-colors hover:bg-emerald-400/20 disabled:opacity-50"
          disabled={isUpdatingStatus}
          onClick={() => onStatusChange("ok")}
        >
          {t("ok")}
        </button>
        <button
          className="rounded-full bg-amber-400/10 px-3 py-1.5 font-semibold text-amber-400 text-xs transition-colors hover:bg-amber-400/20 disabled:opacity-50"
          disabled={isUpdatingStatus}
          onClick={() => onStatusChange("low")}
        >
          {t("low")}
        </button>
      </div>

      <div className="mx-1 h-6 w-px bg-gray-700 dark:bg-slate-600" />

      <button
        className="flex items-center gap-2 rounded-full px-4 py-2 font-bold text-red-400 text-sm transition-all hover:bg-red-500/10"
        onClick={onDelete}
      >
        <Trash2 size={16} />
        {isDeleting ? t("deleting") : t("delete_btn")}
      </button>

      <button
        className="ms-2 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        onClick={onClearSelection}
        title={t("clear_selection")}
      >
        <X size={16} />
      </button>
    </div>
  </MotionDiv>
);
