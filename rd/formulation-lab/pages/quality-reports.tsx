import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, FileSearch, Loader2, ShieldCheck } from "lucide-react";
import { DateTime } from "luxon";
import { type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { AuditReport } from "../components/quality-reports/AuditReport";
import { ManagerReport } from "../components/quality-reports/ManagerReport";
import {
  type QualityFilterState,
  ReportFilters,
} from "../components/quality-reports/ReportFilters";
import type { QualityReportArgs } from "../components/quality-reports/types";
import { useOrganization } from "../context/OrganizationContext";
import { usePermissions } from "../hooks/usePermissions";

const MAXIMUM_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

function defaultDates(zone = "UTC") {
  const today = DateTime.now().setZone(zone).startOf("day");
  return {
    from: today.minus({ days: 29 }).toISODate() ?? "",
    to: today.toISODate() ?? "",
  };
}

export default function QualityReports() {
  const { t } = useTranslation();
  const { activeOrganizationId } = useOrganization();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canView = hasPermission("review_production_checks");
  const settings = useQuery(
    api.productionLineSettings.get,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip"
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [now] = useState(Date.now);
  const zone = settings?.timezone ?? "UTC";
  const defaults = defaultDates(zone);
  const activeView =
    searchParams.get("view") === "audit" || searchParams.get("tab") === "audit"
      ? "audit"
      : "report";
  const filters: QualityFilterState = {
    from: searchParams.get("from") ?? defaults.from,
    to: searchParams.get("to") ?? defaults.to,
    productId: searchParams.get("product") ?? "",
    productionHallCode: searchParams.get("hall") ?? "",
    departmentName: searchParams.get("department") ?? "",
    qcUserId: searchParams.get("inspector") ?? "",
    status: searchParams.get("status") ?? "",
    specificationVersion: searchParams.get("spec") ?? "",
  };

  const reportArgs = useMemo<QualityReportArgs | null>(() => {
    if (!(activeOrganizationId && settings)) {
      return null;
    }
    const from = DateTime.fromISO(filters.from, { zone })
      .startOf("day")
      .toMillis();
    const to = DateTime.fromISO(filters.to, { zone })
      .plus({ days: 1 })
      .startOf("day")
      .toMillis();
    if (
      !(Number.isFinite(from) && Number.isFinite(to) && to > from) ||
      to - from > MAXIMUM_RANGE_MS
    ) {
      return null;
    }
    return {
      organizationId: activeOrganizationId,
      from,
      to,
      now,
      productId: (filters.productId || undefined) as Id<"projects"> | undefined,
      productionHallCode: (filters.productionHallCode || undefined) as
        | "A"
        | "B"
        | undefined,
      departmentName: filters.departmentName || undefined,
      qcUserId: filters.qcUserId || undefined,
      status: (filters.status || undefined) as QualityReportArgs["status"],
      specificationVersion: filters.specificationVersion
        ? Number(filters.specificationVersion)
        : undefined,
    };
  }, [
    activeOrganizationId,
    filters.departmentName,
    filters.from,
    filters.productId,
    filters.productionHallCode,
    filters.qcUserId,
    filters.specificationVersion,
    filters.status,
    filters.to,
    now,
    settings,
    zone,
  ]);

  const filterOptions = useQuery(
    api.qualityManagerReports.getFilterOptions,
    reportArgs
      ? {
          organizationId: reportArgs.organizationId,
          from: reportArgs.from,
          to: reportArgs.to,
        }
      : "skip"
  );

  const setFilters = (next: QualityFilterState) => {
    const params = new URLSearchParams(searchParams);
    const mapping: [keyof QualityFilterState, string][] = [
      ["from", "from"],
      ["to", "to"],
      ["productId", "product"],
      ["productionHallCode", "hall"],
      ["departmentName", "department"],
      ["qcUserId", "inspector"],
      ["status", "status"],
      ["specificationVersion", "spec"],
    ];
    for (const [field, key] of mapping) {
      if (next[field]) {
        params.set(key, next[field]);
      } else {
        params.delete(key);
      }
    }
    setSearchParams(params, { replace: true });
  };

  const setView = (view: "report" | "audit") => {
    const params = new URLSearchParams(searchParams);
    params.set("view", view);
    params.delete("tab");
    setSearchParams(params, { replace: true });
    window.scrollTo({ behavior: "smooth", top: 0 });
  };

  const resetFilters = () => {
    const params = new URLSearchParams();
    params.set("view", activeView);
    const nextDefaults = defaultDates(zone);
    params.set("from", nextDefaults.from);
    params.set("to", nextDefaults.to);
    setSearchParams(params, { replace: true });
  };

  if (permissionsLoading || settings === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#f5a623]" size={30} />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <ShieldCheck className="text-[#527568]" size={32} />
        <h1 className="font-bold font-display text-2xl text-[#173e33] dark:text-[#f7f4df]">
          {t("access_denied")}
        </h1>
      </div>
    );
  }

  let reportContent: ReactNode;
  if (!reportArgs) {
    reportContent = (
      <p className="rounded-[1.75rem] border border-[#a43434]/15 bg-[#fff0ed] py-16 text-center text-[#a43434] text-sm dark:bg-[#6d302d] dark:text-[#ffd4cc]">
        {t("qc_reports_invalid_date_range")}
      </p>
    );
  } else if (activeView === "audit") {
    reportContent = (
      <div className="rounded-[1.75rem] border border-[#1c4a3c]/10 bg-[#fffdf4] p-5 sm:p-7 lg:p-9 dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
        <AuditReport args={reportArgs} />
      </div>
    );
  } else {
    reportContent = (
      <ManagerReport
        args={reportArgs}
        onOpenAudit={() => setView("audit")}
        products={filterOptions?.products}
        timezone={zone}
      />
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="rounded-[1.75rem] bg-[#173e33] px-5 py-5 text-[#f7f4df] shadow-[0_18px_55px_rgba(16,47,39,0.14)] sm:px-7 sm:py-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 font-bold text-[#a9cbbb] text-xs uppercase tracking-[0.18em]">
              {t("quality_control")}
            </p>
            <h1 className="font-bold font-display text-3xl tracking-tight sm:text-4xl">
              {t("qc_reports_title")}
            </h1>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="text-[#a9cbbb] text-xs">
              {t("qc_reports_timezone", { timezone: zone })}
            </div>
            <div className="flex rounded-xl bg-white/8 p-1">
              {(
                [
                  ["report", Activity, "qc_reports_view_report"],
                  ["audit", FileSearch, "qc_reports_view_audit"],
                ] as const
              ).map(([view, Icon, label]) => (
                <button
                  className={`flex min-h-10 items-center gap-2 rounded-lg px-3 font-bold text-xs transition-colors ${
                    activeView === view
                      ? "bg-[#f7f4df] text-[#173e33]"
                      : "text-[#c9ddcf] hover:bg-white/10 hover:text-white"
                  }`}
                  key={view}
                  onClick={() => setView(view)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={15} />
                  {t(label)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-[1.75rem] border border-[#1c4a3c]/10 bg-[#fffdf4] dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
        <ReportFilters
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          options={filterOptions}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          initial={{ opacity: 0, y: 8 }}
          key={activeView}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {reportContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
