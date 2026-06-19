import { pdf } from "@react-pdf/renderer";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  Activity,
  CheckCircle,
  FlaskConical,
  Plus,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import FinishedGoodSpecificationSheet from "../components/FinishedGoodSpecificationSheet";
import InfiniteScrollObserver from "../components/InfiniteScrollObserver";
import NewLabReportModal from "../components/NewLabReportModal";
import { ReportPDF } from "../components/ReportPDF";
import ReportsDropdown from "../components/ReportsDropdown";
import { useSettings } from "../context/SettingsContext";
import { api } from "../convex/_generated/api";
import { usePermissions } from "../hooks/usePermissions";
import { useToast } from "../hooks/useToast";
import { buildAggregatedIngredients } from "../lib/formulation/helpers";
import type { EnrichedLabReport, EnrichedProject } from "../types";

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("All");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string>();
  const { language, profile } = useSettings();
  const { user, role } = usePermissions();
  const { toast } = useToast();

  // Convex Hooks
  const {
    results: reportsUntyped,
    status: reportsStatus,
    loadMore: loadMoreReports,
  } = usePaginatedQuery(
    api.labReports.list,
    { language },
    { initialNumItems: 50 }
  );

  const { results: runsRaw } = usePaginatedQuery(
    api.runs.list,
    {},
    { initialNumItems: 50 }
  );
  const formulationIngredientOptions = useQuery(
    api.ingredients.listFormulationOptions,
    { language }
  );
  const inventoryItems = useQuery(api.inventory.list, { language });

  const updateStatus = useMutation(api.labReports.updateStatus);

  const allReports: EnrichedLabReport[] =
    (reportsUntyped as unknown as EnrichedLabReport[]) ?? [];

  // Build a run lookup map for resolving batch codes
  const runMap = new Map<
    string,
    { batchCode: string; durationString: string }
  >();
  if (runsRaw) {
    for (const run of runsRaw) {
      runMap.set(run._id, {
        batchCode: run.batchCode,
        durationString: run.durationString,
      });
    }
  }

  // Top 3 Recent Reports logic
  const validRecentReports = allReports.filter((r) =>
    (runsRaw ?? []).some((run) => run._id === r.runId)
  );
  const recentReports =
    reportsUntyped && runsRaw ? validRecentReports.slice(0, 3) : [];

  const textureData = [
    { name: t("firmness"), value: 40 },
    { name: t("springiness"), value: 30 },
    { name: t("cohesiveness"), value: 30 },
  ];
  const TEXTURE_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899"];

  const filteredReports = allReports.filter((r) => {
    // Must match filter criteria AND have a linked run
    const matchesFilter =
      filter === "All" ||
      (filter === "Passed" && r.status === "Approved") ||
      (filter === "Failed" && r.status === "Failed");
    const hasValidRun = runMap.has(r.runId);
    return matchesFilter && hasValidRun;
  });
  const activeReport = filteredReports.find(
    (report) => report._id === selectedReportId
  );
  const activeFormulation = useQuery(
    api.projects.get,
    activeReport?.projectId ? { id: activeReport.projectId, language } : "skip"
  ) as EnrichedProject | null | undefined;
  const aggregatedIngredients = useMemo(
    () =>
      buildAggregatedIngredients(
        formulationIngredientOptions ?? [],
        inventoryItems
      ),
    [formulationIngredientOptions, inventoryItems]
  );

  useEffect(() => {
    if (filteredReports.length === 0) {
      return;
    }
    if (
      !(
        selectedReportId &&
        filteredReports.some((report) => report._id === selectedReportId)
      )
    ) {
      setSelectedReportId(filteredReports[0]._id);
    }
  }, [filteredReports, selectedReportId]);

  const handleReportAction = async (
    action: string,
    report: EnrichedLabReport
  ) => {
    switch (action) {
      case "view":
        // View handled by UI click or navigation
        break;
      case "export": {
        try {
          toast.info(t("generating_pdf_summary"));
          const run = runMap.get(report.runId);
          const blob = await pdf(
            <ReportPDF report={report} runBatchCode={run?.batchCode} />
          ).toBlob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `${report.projectName || t("report")}_${report.lotNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success(t("pdf_generated_successfully"));
        } catch (error) {
          toast.error(t("failed_to_generate_pdf"));
          console.error(error);
        }
        break;
      }
      case "toggle_status": {
        if (
          report.leadChemist !== user?.name &&
          role?.key !== "admin" &&
          role?.key !== "supervisor"
        ) {
          toast.error(t("unauthorized_signoff"));
          return;
        }

        const newStatus = report.status === "Approved" ? "Pending" : "Approved";
        const isApproving = newStatus === "Approved";

        await updateStatus({
          id: report._id,
          status: newStatus,
          signoffData: isApproving ? profile?.signatureData : undefined,
          signoffFont: isApproving ? profile?.signatureFont : undefined,
          signoffType: isApproving
            ? (profile?.signatureType as "upload" | "text" | undefined)
            : undefined,
        });
        break;
      }
      case "archive":
        console.log("Archive requested for", report._id);
        break;
      default:
        break;
    }
  };

  if (reportsUntyped === undefined || runsRaw === undefined) {
    return (
      <div className="p-8 text-center text-gray-500">
        {t("loading_reports")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="enterprise-toolbar flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-semibold text-3xl text-slate-950 tracking-tight dark:text-white">
            {t("lab_reports")}
          </h1>
          <p className="mt-1 font-medium text-slate-500 text-sm dark:text-slate-400">
            {t("qc_analysis_performance_metrics")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            {["All", "Passed", "Failed"].map((filterType) => (
              <button
                className={`border px-3 py-1.5 font-semibold text-xs uppercase tracking-wide transition-colors ${
                  filter === filterType
                    ? "border-slate-950 bg-slate-950 text-white dark:border-sky-600 dark:bg-sky-600"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                key={filterType}
                onClick={() => setFilter(filterType)}
                type="button"
              >
                {t(filterType)}
              </button>
            ))}
          </div>
          <button
            className="enterprise-button-primary"
            onClick={() => setShowNewModal(true)}
            type="button"
          >
            <Plus size={16} />

            {t("new_report")}
          </button>
        </div>
      </div>

      <FinishedGoodSpecificationSheet
        activeFormulation={activeFormulation}
        activeReport={activeReport}
        aggregatedIngredients={aggregatedIngredients}
        isLoading={Boolean(activeReport) && activeFormulation === undefined}
        onPrint={() => window.print()}
        onSelectReport={setSelectedReportId}
        reports={filteredReports}
        selectedReportId={selectedReportId}
      />

      <div className="grid auto-rows-min grid-cols-1 gap-3 md:grid-cols-4">
        <div className="col-span-1 min-h-[300px] md:col-span-2">
          <div className="enterprise-panel h-full p-4">
            <div className="mb-4">
              <h3 className="enterprise-section-title">{t("recentReports")}</h3>
            </div>
            <div className="space-y-2">
              {recentReports.map((report, _i) => (
                <div
                  className="group relative flex cursor-pointer items-center gap-3 border border-slate-200 bg-white p-3 transition-colors hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600"
                  key={report._id}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center border ${
                      _i % 2 === 0
                        ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
                        : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300"
                    }`}
                  >
                    <FlaskConical className="stroke-[2.2]" size={16} />
                  </div>

                  <div className="min-w-0 flex-1 text-start">
                    <h4 className="truncate font-semibold text-slate-900 text-sm transition-colors group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-400">
                      {report.projectName}
                    </h4>
                    <div className="mt-0.5 flex items-center gap-2">
                      {report.status === "Approved" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                      )}
                      {report.status === "Failed" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                      )}
                      {report.status !== "Approved" &&
                        report.status !== "Failed" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />
                        )}
                      <p className="truncate font-medium text-charcoal/70 text-xs dark:text-slate-400">
                        {report.status} • {report.results[0]?.parameter}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-30">
                    <ReportsDropdown
                      onAction={handleReportAction}
                      report={report}
                    />
                  </div>
                </div>
              ))}
              {recentReports.length === 0 && (
                <div className="text-center text-gray-500 text-sm dark:text-slate-400">
                  {t("no_recent_reports")}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="enterprise-panel col-span-1 flex flex-col justify-between p-4 md:col-span-2">
          <h3 className="enterprise-section-title mb-3 flex items-center gap-2">
            <div className="h-2 w-2 bg-sky-600" />

            {t("texture_profile")}
          </h3>
          <div className="relative h-32 w-full">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={textureData}
                  dataKey="value"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  stroke="none"
                >
                  {textureData.map((_entry, index) => (
                    <Cell
                      fill={TEXTURE_COLORS[index % TEXTURE_COLORS.length]}
                      key={`texture-cell-${_entry.name}`}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-2">
            <span className="h-1.5 w-6 rounded-full bg-blue-500" />
            <span className="h-1.5 w-6 rounded-full bg-purple-500" />
            <span className="h-1.5 w-6 rounded-full bg-pink-500" />
          </div>
        </div>

        <div className="col-span-1 mt-1 grid grid-cols-1 gap-3 md:col-span-4 lg:grid-cols-2">
          {filteredReports.map((report) => {
            const run = runMap.get(report.runId);
            return (
              <div
                className="enterprise-panel group flex cursor-pointer items-center gap-4 p-4 transition-colors hover:border-slate-500 dark:hover:border-slate-600"
                key={report._id}
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border font-semibold text-lg">
                  {report.status === "Approved" && (
                    <div className="flex h-full w-full items-center justify-center bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                      {t("a_initial")}
                    </div>
                  )}
                  {report.status === "Failed" && (
                    <div className="flex h-full w-full items-center justify-center bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                      {t("f_initial")}
                    </div>
                  )}
                  {report.status !== "Approved" &&
                    report.status !== "Failed" && (
                      <div className="flex h-full w-full items-center justify-center bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                        {t("pending_initial")}
                      </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <h4 className="truncate font-semibold text-slate-900 text-base transition-colors group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                      {report.projectName}
                    </h4>
                    <span className="font-mono text-gray-400 text-xs dark:text-slate-500">
                      {report.lotNumber}
                    </span>
                  </div>

                  {/* Run / Batch link */}
                  {run && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <FlaskConical
                        className="text-indigo-500 dark:text-indigo-400"
                        size={12}
                      />
                      <span className="border border-sky-200 bg-sky-50 px-2 py-0.5 font-mono font-semibold text-sky-700 text-xs dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-400">
                        {run.batchCode}
                      </span>
                      <span className="text-gray-400 text-xs dark:text-slate-500">
                        • {run.durationString}
                      </span>
                    </div>
                  )}

                  <p className="mt-1 text-gray-500 text-sm dark:text-slate-400">
                    {report.results.length} {t("tests_lead")}{" "}
                    {report.leadChemist}
                  </p>

                  <div className="mt-3 flex gap-2">
                    {report.results.slice(0, 2).map((res) => (
                      <span
                        className="border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-600 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        key={`${report._id}-res-${res.parameter}`}
                      >
                        {res.parameter}:{" "}
                        <span className="font-bold text-gray-900 dark:text-white">
                          {res.actualValue}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-3">
                  <div title={t("status_value", { status: report.status })}>
                    {report.status === "Approved" && (
                      <CheckCircle
                        className="text-green-500 dark:text-green-400"
                        size={24}
                      />
                    )}
                    {report.status === "Failed" && (
                      <XCircle
                        className="text-red-500 dark:text-red-400"
                        size={24}
                      />
                    )}
                    {report.status === "Pending" && (
                      <Activity
                        className="text-orange-500 dark:text-orange-400"
                        size={24}
                      />
                    )}
                  </div>
                  <ReportsDropdown
                    onAction={handleReportAction}
                    report={report}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <InfiniteScrollObserver
          canLoadMore={reportsStatus === "CanLoadMore"}
          isLoading={reportsStatus === "LoadingMore"}
          onLoadMore={() => loadMoreReports(50)}
        />
      </div>

      {/* New Lab Report Modal */}
      <NewLabReportModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        runs={(runsRaw || []).map((r) => ({
          _id: r._id,
          batchCode: r.batchCode,
          projectId: r.projectId,
          projectName: r.projectName,
        }))}
      />
    </div>
  );
};

export default Reports;
