import type { Id } from "@flavoneer/backend/data-model";
import { CalendarRange, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface QualityFilterState {
  departmentName: string;
  from: string;
  productId: string;
  productionHallCode: string;
  qcUserId: string;
  specificationVersion: string;
  status: string;
  to: string;
}

interface FilterOptions {
  departmentNames: string[];
  productionHallCodes: ("A" | "B")[];
  products: { id: Id<"projects">; name: string }[];
  qcUsers: { id: string; name: string }[];
  specificationVersions: number[];
}

export function ReportFilters({
  filters,
  onChange,
  onReset,
  options,
}: {
  filters: QualityFilterState;
  onChange: (next: QualityFilterState) => void;
  onReset: () => void;
  options?: FilterOptions;
}) {
  const { t } = useTranslation();
  const inputClass =
    "min-h-11 rounded-2xl border border-[#1c4a3c]/10 bg-[#fffdf4] px-3 text-[#173e33] text-sm outline-none transition-colors focus:border-[#f5a623] dark:border-[#d2f2d4]/10 dark:bg-[#173e33] dark:text-[#f7f4df]";
  const set = (key: keyof QualityFilterState, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="border-[#1c4a3c]/10 border-y bg-[#eef8eb]/55 px-4 py-4 dark:border-[#d2f2d4]/10 dark:bg-[#102f27]/45">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5">
          <span className="font-bold text-[#527568] text-[10px] uppercase tracking-[0.12em] dark:text-[#a9cbbb]">
            {t("qc_reports_from")}
          </span>
          <span className="relative">
            <CalendarRange
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#527568]"
              size={15}
            />
            <input
              className={`${inputClass} ps-9`}
              onChange={(event) => set("from", event.target.value)}
              type="date"
              value={filters.from}
            />
          </span>
        </label>
        <label className="grid gap-1.5">
          <span className="font-bold text-[#527568] text-[10px] uppercase tracking-[0.12em] dark:text-[#a9cbbb]">
            {t("qc_reports_to")}
          </span>
          <input
            className={inputClass}
            onChange={(event) => set("to", event.target.value)}
            type="date"
            value={filters.to}
          />
        </label>
        <FilterSelect
          label={t("product_label")}
          onChange={(value) => set("productId", value)}
          value={filters.productId}
        >
          <option value="">{t("all")}</option>
          {options?.products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label={t("production_hall")}
          onChange={(value) => set("productionHallCode", value)}
          value={filters.productionHallCode}
        >
          <option value="">{t("all")}</option>
          {options?.productionHallCodes.map((hall) => (
            <option key={hall} value={hall}>
              {hall}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label={t("department_or_line")}
          onChange={(value) => set("departmentName", value)}
          value={filters.departmentName}
        >
          <option value="">{t("all")}</option>
          {options?.departmentNames.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label={t("qc_inspector")}
          onChange={(value) => set("qcUserId", value)}
          value={filters.qcUserId}
        >
          <option value="">{t("all")}</option>
          {options?.qcUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label={t("status")}
          onChange={(value) => set("status", value)}
          value={filters.status}
        >
          <option value="">{t("all")}</option>
          {["draft", "pending_production_review", "returned", "approved"].map(
            (status) => (
              <option key={status} value={status}>
                {t(`production_status_${status}`)}
              </option>
            )
          )}
        </FilterSelect>
        <FilterSelect
          label={t("qc_reports_specification_version")}
          onChange={(value) => set("specificationVersion", value)}
          value={filters.specificationVersion}
        >
          <option value="">{t("all")}</option>
          {options?.specificationVersions.map((version) => (
            <option key={version} value={version}>
              v{version}
            </option>
          ))}
        </FilterSelect>
        <button
          className="flex min-h-11 items-center gap-2 rounded-2xl px-4 font-bold text-[#527568] text-sm transition-colors hover:bg-[#d2f2d4] hover:text-[#173e33] dark:text-[#a9cbbb] dark:hover:bg-[#285b4d] dark:hover:text-[#f7f4df]"
          onClick={onReset}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={15} />
          {t("qc_reports_reset_filters")}
        </button>
      </div>
    </div>
  );
}

function FilterSelect({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="font-bold text-[#527568] text-[10px] uppercase tracking-[0.12em] dark:text-[#a9cbbb]">
        {label}
      </span>
      <select
        className="min-h-11 max-w-52 rounded-2xl border border-[#1c4a3c]/10 bg-[#fffdf4] px-3 text-[#173e33] text-sm outline-none transition-colors focus:border-[#f5a623] dark:border-[#d2f2d4]/10 dark:bg-[#173e33] dark:text-[#f7f4df]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}
