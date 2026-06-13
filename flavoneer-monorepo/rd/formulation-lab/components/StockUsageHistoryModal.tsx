import { useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { FlaskConical, History, Package, TrendingDown, X } from "lucide-react";
import { DateTime } from "luxon";
import type React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { api } from "../convex/_generated/api";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";
import type { EnrichedInventoryItem } from "../types";

interface StockUsageHistoryModalProps {
  item: EnrichedInventoryItem | null;
  onClose: () => void;
}

const StockUsageHistoryModal: React.FC<StockUsageHistoryModalProps> = ({
  item,
  onClose,
}) => {
  const { isRTL } = useSettings();
  const { t } = useTranslation();
  const usageHistory = useQuery(
    api.inventory.getUsageHistory,
    item ? { inventoryItemId: item._id } : "skip"
  );

  if (!item) {
    return null;
  }

  // Sort by most recent first
  const sortedHistory = usageHistory
    ? [...usageHistory].sort((a, b) => b.createdAt - a.createdAt)
    : null;

  const totalConsumed = sortedHistory
    ? sortedHistory.reduce((sum, entry) => sum + entry.quantityUsed, 0)
    : 0;

  return createPortal(
    <AnimatePresence>
      {item && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
          onClick={onClose}
        >
          {/* Backdrop */}
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm dark:bg-black/60"
            exit="exit"
            initial="hidden"
            variants={overlayVariants}
          />

          {/* Modal */}
          <MotionDiv
            animate="visible"
            className="relative z-[1000] flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-slate-800"
            exit="exit"
            initial="hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            variants={modalVariants}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-gray-100 border-b p-6 pb-4 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300">
                  <History size={22} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-xl dark:text-white">
                    {t("stock_usage_history")}
                  </h2>
                  <p className="font-medium text-gray-500 text-sm dark:text-slate-400">
                    {item.name}
                  </p>
                </div>
              </div>
              <button
                className="rounded-full bg-gray-50 p-2 transition-colors hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600"
                onClick={onClose}
              >
                <X className="text-gray-500 dark:text-slate-300" size={18} />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 p-6 pb-4">
              <div className="rounded-2xl bg-gray-50 p-4 text-center dark:bg-slate-700/50">
                <span className="font-bold text-[10px] text-gray-400 uppercase tracking-wider dark:text-slate-500">
                  {t("current_stock")}
                </span>
                <p className="mt-1 font-bold text-gray-900 text-xl dark:text-white">
                  {item.stock.toFixed(1)}
                  <span className="ms-1 font-medium text-gray-500 text-sm dark:text-slate-400">
                    {item.unit}
                  </span>
                </p>
              </div>
              <div className="rounded-2xl bg-orange-50 p-4 text-center dark:bg-orange-900/20">
                <span className="font-bold text-[10px] text-orange-500 uppercase tracking-wider dark:text-orange-400">
                  {t("total_consumed")}
                </span>
                <p className="mt-1 font-bold text-orange-700 text-xl dark:text-orange-300">
                  {totalConsumed.toFixed(1)}
                  <span className="ms-1 font-medium text-orange-500 text-sm dark:text-orange-400">
                    {item.unit}
                  </span>
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4 text-center dark:bg-blue-900/20">
                <span className="font-bold text-[10px] text-blue-500 uppercase tracking-wider dark:text-blue-400">
                  {t("projects_using")}
                </span>
                <p className="mt-1 font-bold text-blue-700 text-xl dark:text-blue-300">
                  {item.usedIn?.length ?? 0}
                </p>
              </div>
            </div>

            {/* Usage Log Table */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {sortedHistory === null ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="animate-pulse font-medium text-gray-400 dark:text-slate-500">
                    {t("loading")}
                  </div>
                </div>
              ) : sortedHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-gray-100 border-dashed py-12 text-center dark:border-slate-700">
                  <Package
                    className="mb-3 text-gray-200 dark:text-slate-700"
                    size={48}
                  />
                  <p className="font-medium text-gray-400 dark:text-slate-500">
                    {t("no_usage_recorded_yet")}
                  </p>
                  <p className="mt-1 text-gray-300 text-xs dark:text-slate-600">
                    {t("stock_will_be_deducted_when_a_run_uses_t")}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-900/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-gray-100 border-b dark:border-slate-700">
                        <th className="px-4 py-3 text-start font-bold text-[10px] text-gray-400 uppercase tracking-wider dark:text-slate-500">
                          {t("date")}
                        </th>
                        <th className="px-4 py-3 text-start font-bold text-[10px] text-gray-400 uppercase tracking-wider dark:text-slate-500">
                          {t("project")}
                        </th>
                        <th className="px-4 py-3 text-start font-bold text-[10px] text-gray-400 uppercase tracking-wider dark:text-slate-500">
                          {t("batch_code")}
                        </th>
                        <th className="px-4 py-3 text-end font-bold text-[10px] text-gray-400 uppercase tracking-wider dark:text-slate-500">
                          {t("qty_used")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHistory.map((entry) => (
                        <tr
                          className="border-gray-50 border-b transition-colors last:border-0 hover:bg-white dark:border-slate-800 dark:hover:bg-slate-800/50"
                          key={entry._id}
                        >
                          <td className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300">
                            {DateTime.fromMillis(
                              entry.createdAt
                            ).toLocaleString(DateTime.DATE_MED)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FlaskConical
                                className="flex-shrink-0 text-indigo-400 dark:text-indigo-300"
                                size={14}
                              />
                              <span className="max-w-[160px] truncate font-bold text-gray-900 dark:text-white">
                                {entry.projectName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 font-bold font-mono text-gray-500 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              {entry.batchCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-end">
                            <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                              <TrendingDown size={12} />-
                              {entry.quantityUsed.toFixed(2)} {entry.unit}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default StockUsageHistoryModal;
