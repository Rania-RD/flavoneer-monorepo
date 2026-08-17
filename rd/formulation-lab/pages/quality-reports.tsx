import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  FileSearch,
  FlaskConical,
  Gauge,
  Loader2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { DateTime } from "luxon";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { AuditReport } from "../components/quality-reports/AuditReport";
import { ComparisonReport } from "../components/quality-reports/ComparisonReport";
import { LaboratoryReport } from "../components/quality-reports/LaboratoryReport";
import { MeasurementReport } from "../components/quality-reports/MeasurementReport";
import { OverviewReport } from "../components/quality-reports/OverviewReport";
import { ReadinessReport } from "../components/quality-reports/ReadinessReport";
import {
  type QualityFilterState,
  ReportFilters,
} from "../components/quality-reports/ReportFilters";
import type { QualityReportArgs } from "../components/quality-reports/types";
import { WorkflowReport } from "../components/quality-reports/WorkflowReport";
import { useOrganization } from "../context/OrganizationContext";
import { usePermissions } from "../hooks/usePermissions";

const tabs = [
  { key: "overview", icon: Activity },
  { key: "measurements", icon: Gauge },
  { key: "readiness", icon: ClipboardCheck },
  { key: "comparison", icon: BarChart3 },
  { key: "workflow", icon: UsersRound },
  { key: "audit", icon: FileSearch },
  { key: "laboratory", icon: FlaskConical },
] as const;

type TabKey = (typeof tabs)[number]["key"];
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
  const [now, setNow] = useState(Date.now());
  const zone = settings?.timezone ?? "UTC";
  const defaults = defaultDates(zone);
  const activeTab = tabs.some((tab) => tab.key === searchParams.get("tab"))
    ? (searchParams.get("tab") as TabKey)
    : "overview";
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

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

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
          now: reportArgs.now,
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

  const setTab = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    setSearchParams(params, { replace: true });
  };

  const resetFilters = () => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
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

  const activeReport = (() => {
    if (!reportArgs) {
      return (
        <p className="py-16 text-center text-[#a43434] text-sm dark:text-[#ffb8ad]">
          {t("qc_reports_invalid_date_range")}
        </p>
      );
    }
    switch (activeTab) {
      case "overview":
        return <OverviewReport args={reportArgs} />;
      case "measurements":
        return <MeasurementReport args={reportArgs} />;
      case "readiness":
        return <ReadinessReport args={reportArgs} />;
      case "comparison":
        return <ComparisonReport args={reportArgs} />;
      case "workflow":
        return <WorkflowReport args={reportArgs} />;
      case "audit":
        return <AuditReport args={reportArgs} />;
      case "laboratory":
        return <LaboratoryReport args={reportArgs} />;
      default:
        return <OverviewReport args={reportArgs} />;
    }
  })();

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 px-1 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-bold text-[#527568] text-xs uppercase tracking-[0.18em] dark:text-[#a9cbbb]">
            {t("quality_control")}
          </p>
          <h1 className="font-bold font-display text-3xl text-[#173e33] tracking-tight sm:text-4xl dark:text-[#f7f4df]">
            {t("qc_reports_title")}
          </h1>
          <p className="mt-2 max-w-3xl text-[#527568] text-sm dark:text-[#a9cbbb]">
            {t("qc_reports_subtitle")}
          </p>
        </div>
        <div className="text-[#527568] text-xs dark:text-[#a9cbbb]">
          {t("qc_reports_timezone", { timezone: zone })}
        </div>
      </header>

      <div className="overflow-hidden rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#fffdf4] shadow-[0_18px_55px_rgba(16,47,39,0.08)] dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
        <div className="flex gap-1 overflow-x-auto border-[#1c4a3c]/10 border-b px-3 pt-3 dark:border-[#d2f2d4]/10">
          {tabs.map((tab) => (
            <button
              className={`flex min-h-12 shrink-0 items-center gap-2 rounded-t-2xl px-4 font-bold text-xs transition-colors ${
                activeTab === tab.key
                  ? "bg-[#eef8eb] text-[#173e33] dark:bg-[#285b4d] dark:text-[#f7f4df]"
                  : "text-[#527568] hover:bg-[#eef8eb]/55 dark:text-[#a9cbbb] dark:hover:bg-[#285b4d]/45"
              }`}
              key={tab.key}
              onClick={() => setTab(tab.key)}
              type="button"
            >
              <tab.icon aria-hidden="true" size={16} />
              {t(`qc_reports_tab_${tab.key}`)}
            </button>
          ))}
        </div>
        <ReportFilters
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          options={filterOptions}
        />
        <div className="p-5 sm:p-7 lg:p-9">
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: 8 }}
              key={activeTab}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {activeReport}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
