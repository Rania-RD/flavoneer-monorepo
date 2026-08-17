import { api } from "@flavoneer/backend/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  cellClassName,
  EmptyReport,
  formatDateTime,
  formatDuration,
  MetricStrip,
  REPORT_COLORS,
  ReportChart,
  ReportHeading,
  ReportLoading,
  ReportTable,
  rowClassName,
} from "./shared";
import type { QualityReportArgs } from "./types";

type OverviewReportData = FunctionReturnType<
  typeof api.qualityManagerReports.getOverview
>;

export function OverviewReport({
  args,
  data,
  embedded = false,
}: {
  args: QualityReportArgs;
  data?: OverviewReportData;
  embedded?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const queriedReport = useQuery(
    api.qualityManagerReports.getOverview,
    data ? "skip" : args
  );
  const report = data ?? queriedReport;
  const locale = i18n.language === "ar" ? "ar-PS" : "en";
  if (report === undefined) {
    return <ReportLoading />;
  }

  return (
    <div className="space-y-7">
      {embedded ? null : (
        <ReportHeading
          description={t("qc_reports_overview_description")}
          title={t("qc_reports_overview")}
        />
      )}
      <p className="rounded-2xl border border-[#f5a623]/25 bg-[#fff4d9] px-4 py-3 font-semibold text-[#795018] text-sm dark:bg-[#f5a623]/10 dark:text-[#ffc760]">
        {t("qc_reports_hourly_inspection_requirement")}
      </p>
      {embedded ? null : (
        <MetricStrip
          items={[
            {
              label: t("qc_reports_inspections"),
              value: report.totals.inspections,
            },
            {
              label: t("qc_reports_pending_queue"),
              value: report.totals.pending,
              tone: report.totals.pending > 0 ? "warning" : "default",
            },
            {
              label: t("qc_reports_out_of_limit_records"),
              value: report.totals.outOfLimitRecords,
              tone: report.totals.outOfLimitRecords > 0 ? "danger" : "default",
            },
            {
              label: t("qc_reports_oldest_pending_hhmm"),
              value: formatDuration(report.totals.oldestPendingAgeMs, locale),
            },
          ]}
        />
      )}

      {report.awaitingBackfill > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-[#fff4d9] px-4 py-3 text-[#8a5811] text-sm dark:bg-[#f5a623]/15 dark:text-[#ffc760]">
          <TriangleAlert aria-hidden="true" size={18} />
          {t("qc_reports_awaiting_backfill", {
            count: report.awaitingBackfill,
          })}
        </div>
      ) : null}

      <section className="border-[#1c4a3c]/10 border-y py-5 dark:border-[#d2f2d4]/10">
        <h3 className="px-1 font-bold text-[#173e33] text-sm dark:text-[#f7f4df]">
          {t("qc_reports_inspections_by_hour")}
        </h3>
        {report.timeline.length === 0 ? (
          <EmptyReport>{t("qc_reports_no_data")}</EmptyReport>
        ) : (
          <ReportChart
            className="mt-4 h-72"
            options={{
              axes: {
                x: { label: { fontSize: 10 }, type: "category" },
                y: {
                  interval: { minSpacing: 28 },
                  label: {
                    fontSize: 10,
                    formatter: ({ value }) => `${Math.round(value)}`,
                  },
                  type: "number",
                },
              },
              data: report.timeline,
              padding: { bottom: 12, left: 8, right: 12, top: 12 },
              series: [
                {
                  fill: REPORT_COLORS.mint,
                  stacked: true,
                  type: "bar",
                  xKey: "key",
                  yKey: "draft",
                  yName: t("production_status_draft"),
                },
                {
                  fill: REPORT_COLORS.amber,
                  stacked: true,
                  type: "bar",
                  xKey: "key",
                  yKey: "pending",
                  yName: t("production_status_pending_production_review"),
                },
                {
                  fill: REPORT_COLORS.red,
                  stacked: true,
                  type: "bar",
                  xKey: "key",
                  yKey: "returned",
                  yName: t("production_status_returned"),
                },
                {
                  cornerRadius: 5,
                  fill: REPORT_COLORS.forest,
                  stacked: true,
                  type: "bar",
                  xKey: "key",
                  yKey: "approved",
                  yName: t("production_status_approved"),
                },
              ],
            }}
          />
        )}
      </section>

      <section className="space-y-4">
        <h3 className="px-1 font-bold font-display text-[#173e33] text-xl dark:text-[#f7f4df]">
          {t("qc_reports_action_queue")}
        </h3>
        {report.exceptions.length === 0 ? (
          <EmptyReport>{t("qc_reports_no_exceptions")}</EmptyReport>
        ) : (
          <ReportTable
            headers={[
              t("form_serial"),
              t("product_label"),
              t("department_or_line"),
              t("qc_inspector"),
              t("inspection_time"),
              t("qc_reports_exception"),
              t("status"),
              "",
            ]}
          >
            {report.exceptions.map((row) => (
              <tr className={rowClassName} key={row.recordId}>
                <td className={`${cellClassName} font-bold font-mono`}>
                  {row.displaySerial}
                </td>
                <td className={cellClassName}>
                  <p className="font-bold">{row.productName}</p>
                  <p className="mt-1 font-mono text-[#527568] text-xs dark:text-[#a9cbbb]">
                    {row.printedBatchCode ?? "—"}
                  </p>
                </td>
                <td className={cellClassName}>{row.departmentName}</td>
                <td className={cellClassName}>{row.qcUserName}</td>
                <td className={cellClassName}>
                  {formatDateTime(row.inspectionAt, locale)}
                </td>
                <td className={cellClassName}>
                  {row.outOfLimitReadingCount > 0 ? (
                    <span className="text-[#a43434] dark:text-[#ffb8ad]">
                      {t("qc_reports_out_of_limit_count", {
                        count: row.outOfLimitReadingCount,
                      })}
                    </span>
                  ) : row.pendingAgeMs === null ? (
                    t("production_status_returned")
                  ) : (
                    t("qc_reports_pending_for_hhmm", {
                      duration: formatDuration(row.pendingAgeMs, locale),
                    })
                  )}
                </td>
                <td className={cellClassName}>
                  {t(`production_status_${row.status}`)}
                </td>
                <td className={cellClassName}>
                  <Link
                    aria-label={t("view_record")}
                    className="inline-flex size-9 items-center justify-center rounded-full bg-[#d2f2d4] text-[#173e33] dark:bg-[#f5a623]"
                    to={`/quality/production-line-records/${row.recordId}`}
                  >
                    <ArrowUpRight aria-hidden="true" size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </ReportTable>
        )}
      </section>
    </div>
  );
}
