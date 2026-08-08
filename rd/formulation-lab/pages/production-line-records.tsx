import { api } from "@flavoneer/backend/api";
import { usePaginatedQuery } from "convex/react";
import {
  ArrowUpRight,
  Camera,
  Factory,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useOrganization } from "../context/OrganizationContext";
import { usePermissions } from "../hooks/usePermissions";

type RecordStatus =
  | "draft"
  | "pending_production_review"
  | "returned"
  | "approved";

const statusOptions: (RecordStatus | "all")[] = [
  "all",
  "pending_production_review",
  "draft",
  "returned",
  "approved",
];

const statusClasses: Record<RecordStatus, string> = {
  draft: "bg-[#eef8eb] text-[#1c4a3c] dark:bg-[#285b4d] dark:text-[#d2f2d4]",
  pending_production_review:
    "bg-[#fff4d9] text-[#8a5811] dark:bg-[#f5a623]/20 dark:text-[#ffc760]",
  returned:
    "bg-[#fff0ed] text-[#a43434] dark:bg-[#a43434]/20 dark:text-[#ffb8ad]",
  approved:
    "bg-[#e8f7ed] text-[#247a51] dark:bg-[#247a51]/20 dark:text-[#9be0b8]",
};

export default function ProductionLineRecords() {
  const { t, i18n } = useTranslation();
  const { activeOrganizationId } = useOrganization();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canViewProductionChecks = hasPermission("view_production_checks");
  const [status, setStatus] = useState<RecordStatus | "all">(
    "pending_production_review"
  );
  const {
    results,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.productionLineRecords.listForReview,
    activeOrganizationId && canViewProductionChecks
      ? {
          organizationId: activeOrganizationId,
          status: status === "all" ? undefined : status,
        }
      : "skip",
    { initialNumItems: 20 }
  );

  const formatDate = (value: number) =>
    new Intl.DateTimeFormat(i18n.language === "ar" ? "ar-PS" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);

  if (permissionsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#f5a623]" size={30} />
      </div>
    );
  }

  if (!canViewProductionChecks) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#d2f2d4] text-[#173e33] dark:bg-[#285b4d] dark:text-[#d2f2d4]">
          <ShieldCheck aria-hidden="true" size={28} />
        </div>
        <h1 className="font-bold font-display text-2xl text-[#173e33] dark:text-[#f7f4df]">
          {t("access_denied")}
        </h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 px-1 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-[1.2rem] bg-[#f5a623] text-[#173e33] shadow-[#102f27]/10 shadow-lg">
            <Factory aria-hidden="true" size={25} />
          </div>
          <p className="mb-2 font-bold text-[#527568] text-xs uppercase tracking-[0.18em] dark:text-[#a9cbbb]">
            {t("quality_control")}
          </p>
          <h1 className="font-bold font-display text-3xl text-[#173e33] tracking-tight sm:text-4xl dark:text-[#f7f4df]">
            {t("production_monitoring")}
          </h1>
          <p className="mt-2 max-w-2xl text-[#527568] text-sm dark:text-[#a9cbbb]">
            {t("production_monitoring_subtitle")}
          </p>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusOptions.map((option) => (
          <button
            className={`whitespace-nowrap rounded-full px-5 py-2.5 font-bold text-sm transition-all active:scale-95 ${
              status === option
                ? "bg-[#1c4a3c] text-white shadow-md dark:bg-[#f5a623] dark:text-[#173e33]"
                : "bg-[#fffdf4] text-[#527568] hover:bg-[#d2f2d4]/60 dark:bg-[#173e33] dark:text-[#a9cbbb] dark:hover:bg-[#285b4d]"
            }`}
            key={option}
            onClick={() => setStatus(option)}
            type="button"
          >
            {t(`production_status_${option}`)}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#fffdf4] shadow-[0_18px_55px_rgba(16,47,39,0.08)] dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
        <div className="hidden grid-cols-[0.65fr_1.4fr_1fr_1fr_1.1fr_auto] gap-4 border-[#1c4a3c]/10 border-b px-8 py-4 font-bold text-[#527568] text-xs uppercase tracking-wider lg:grid dark:border-[#d2f2d4]/10 dark:text-[#a9cbbb]">
          <span>{t("form_serial")}</span>
          <span>{t("product_label")}</span>
          <span>{t("department_or_line")}</span>
          <span>{t("qc_inspector")}</span>
          <span>{t("inspection_time")}</span>
          <span className="sr-only">{t("view_record")}</span>
        </div>

        {paginationStatus === "LoadingFirstPage" ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="animate-spin text-[#f5a623]" size={28} />
          </div>
        ) : null}

        {paginationStatus !== "LoadingFirstPage" && results.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#eef8eb] text-[#527568] dark:bg-[#285b4d] dark:text-[#a9cbbb]">
              <Factory aria-hidden="true" size={28} />
            </div>
            <p className="max-w-sm text-[#527568] text-sm dark:text-[#a9cbbb]">
              {t("no_production_records")}
            </p>
          </div>
        ) : null}

        {paginationStatus !== "LoadingFirstPage" && results.length > 0 ? (
          <div className="divide-y divide-[#1c4a3c]/10 dark:divide-[#d2f2d4]/10">
            {results.map((record) => (
              <Link
                className="group grid gap-4 px-6 py-5 transition-colors hover:bg-[#eef8eb]/70 lg:grid-cols-[0.65fr_1.4fr_1fr_1fr_1.1fr_auto] lg:items-center lg:px-8 dark:hover:bg-[#285b4d]/45"
                key={record._id}
                to={`/quality/production-line-records/${record._id}`}
              >
                <div className="flex min-w-0 items-center justify-between gap-3 lg:flex-col lg:items-start lg:justify-center lg:gap-2">
                  <span className="min-w-0 truncate font-bold font-mono text-[#173e33] dark:text-[#f7f4df]">
                    {record.displaySerial}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 font-bold text-[10px] ${statusClasses[record.status as RecordStatus]}`}
                  >
                    {t(`production_status_${record.status}`)}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-[#173e33] dark:text-[#f7f4df]">
                    {record.productName}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[#527568] text-xs dark:text-[#a9cbbb]">
                    <Camera aria-hidden="true" size={13} />
                    {record.printedBatchCode ?? t("evidence_not_captured")}
                  </p>
                </div>
                <p className="text-[#527568] text-sm dark:text-[#a9cbbb]">
                  {record.departmentName}
                </p>
                <p className="text-[#527568] text-sm dark:text-[#a9cbbb]">
                  {record.qcUserName}
                </p>
                <p className="text-[#527568] text-sm dark:text-[#a9cbbb]">
                  {formatDate(record.inspectionAt)}
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d2f2d4] text-[#173e33] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:bg-[#f5a623]">
                  <ArrowUpRight aria-hidden="true" size={18} />
                </span>
              </Link>
            ))}
          </div>
        ) : null}

        {paginationStatus === "CanLoadMore" ? (
          <div className="border-[#1c4a3c]/10 border-t p-5 text-center dark:border-[#d2f2d4]/10">
            <button
              className="rounded-full bg-[#1c4a3c] px-6 py-3 font-bold text-sm text-white transition-transform active:scale-95 dark:bg-[#f5a623] dark:text-[#173e33]"
              onClick={() => loadMore(20)}
              type="button"
            >
              {t("load_more")}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
