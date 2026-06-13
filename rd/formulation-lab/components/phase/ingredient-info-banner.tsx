import { useTranslation } from "react-i18next";
import { formatLimitValue } from "../../convex/regulatoryHelpers";
import type { AggregatedIngredient } from "../../types";

interface AdditiveLimitRecord {
  categoryCode?: unknown;
  categoryName?: unknown;
  mgPerKg?: unknown;
  status?: unknown;
}

interface IngredientInfoBannerProps {
  additiveLimit: unknown;
  expectedWeight: number | undefined;
  selectedItem: AggregatedIngredient | undefined;
}

const readAdditiveLimit = (additiveLimit: unknown) => {
  if (!(additiveLimit && typeof additiveLimit === "object")) {
    return undefined;
  }

  return additiveLimit as AdditiveLimitRecord;
};

export const IngredientInfoBanner = ({
  additiveLimit,
  expectedWeight,
  selectedItem,
}: IngredientInfoBannerProps) => {
  const { t } = useTranslation();

  if (!selectedItem) {
    return null;
  }

  const hasAllergens =
    selectedItem.allergens && selectedItem.allergens.length > 0;
  const isInsufficientStock = (expectedWeight || 0) > selectedItem.stock;
  const limit = readAdditiveLimit(additiveLimit);
  const limitText =
    limit?.status === "found" && typeof limit.mgPerKg === "number"
      ? formatLimitValue(limit.mgPerKg)
      : undefined;

  return (
    <div className="col-span-1 mt-2 space-y-3 lg:col-span-2">
      <div className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm dark:border-indigo-800/30 dark:bg-indigo-900/10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-indigo-900 dark:text-indigo-100">
            {t("allergens")}:
          </span>
          <span className="font-medium text-indigo-800 dark:text-indigo-300">
            {hasAllergens
              ? selectedItem.allergens.join(", ")
              : t("none")}
          </span>
        </div>
        <div className="flex flex-col gap-2 rounded-lg bg-white/60 p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-800/60">
          <div>
            <span className="font-bold text-gray-700 dark:text-slate-300">
              {t("stock_status")}:{" "}
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {selectedItem.stock} {selectedItem.unit}
            </span>
          </div>
          {selectedItem.nearestExpiry && (
            <div>
              <span className="font-bold text-gray-700 dark:text-slate-300">
                {t("nearest_expiry")}:{" "}
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {selectedItem.nearestExpiry}
              </span>
            </div>
          )}
        </div>
        {selectedItem.isAdditive && (
          <div className="rounded-lg border border-indigo-100 bg-white/70 p-3 dark:border-indigo-800/30 dark:bg-slate-800/70">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-bold text-gray-700 dark:text-slate-300">
                {t("additive_limit")}
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {limitText ||
                  (limit?.status === "category_missing"
                    ? t("select_gsfa_category_to_check_limits")
                    : t("no_gsfa_limit_found"))}
              </span>
            </div>
            {limit?.status === "found" && (
              <p className="mt-1 text-gray-500 text-xs dark:text-slate-400">
                {t("limit_category_match", {
                  code: String(limit.categoryCode || ""),
                  name: String(limit.categoryName || ""),
                })}
              </p>
            )}
          </div>
        )}
      </div>
      {isInsufficientStock && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 font-bold text-red-700 text-sm shadow-sm dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400">
          <span>⚠️</span>
          <span>
            {t("insufficient_stock_in_inventory")}
          </span>
        </div>
      )}
    </div>
  );
};
