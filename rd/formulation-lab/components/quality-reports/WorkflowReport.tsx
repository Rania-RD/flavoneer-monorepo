import { api } from "@flavoneer/backend/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useTranslation } from "react-i18next";
import {
  cellClassName,
  EmptyReport,
  formatDuration,
  formatPercent,
  MetricStrip,
  REPORT_COLORS,
  ReportChart,
  ReportHeading,
  ReportLoading,
  ReportTable,
  rowClassName,
} from "./shared";
import type { QualityReportArgs } from "./types";

type WorkflowReportData = FunctionReturnType<
  typeof api.qualityManagerReports.getWorkflow
>;

export function WorkflowReport({
  args,
  data,
  embedded = false,
}: {
  args: QualityReportArgs;
  data?: WorkflowReportData;
  embedded?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const queriedReport = useQuery(
    api.qualityManagerReports.getWorkflow,
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
          description={t("qc_reports_workflow_description")}
          title={t("qc_reports_workflow")}
        />
      )}
      <MetricStrip
        items={[
          {
            label: t("qc_reports_submissions"),
            value: report.totals.submissions,
          },
          {
            label: t("qc_reports_pending_queue"),
            value: report.totals.pending,
            tone: report.totals.pending > 0 ? "warning" : "default",
          },
          {
            label: t("qc_reports_median_review_hhmm"),
            value: formatDuration(report.totals.medianReviewTimeMs, locale),
          },
          {
            label: t("qc_reports_p90_review_hhmm"),
            value: formatDuration(report.totals.p90ReviewTimeMs, locale),
          },
        ]}
      />

      <section className="border-[#1c4a3c]/10 border-y py-5 dark:border-[#d2f2d4]/10">
        <h3 className="px-1 font-bold text-[#173e33] text-sm dark:text-[#f7f4df]">
          {t("qc_reports_review_outcomes")}
        </h3>
        <ReportChart
          className="mt-4 h-64"
          options={{
            axes: {
              x: {
                label: {
                  formatter: ({ value }) => `${Math.round(value)}`,
                },
                type: "number",
              },
              y: { label: { fontSize: 11 }, type: "category" },
            },
            data: [
              {
                name: t("qc_reports_approved"),
                value: report.totals.approvals,
              },
              {
                name: t("qc_reports_returned"),
                value: report.totals.returns,
              },
              {
                name: t("qc_reports_pending_queue"),
                value: report.totals.pending,
              },
            ],
            legend: { enabled: false },
            padding: { bottom: 8, left: 16, right: 20, top: 8 },
            series: [
              {
                cornerRadius: 7,
                direction: "horizontal",
                fill: REPORT_COLORS.forest,
                type: "bar",
                xKey: "name",
                yKey: "value",
              },
            ],
          }}
        />
      </section>

      <section className="space-y-4">
        <h3 className="px-1 font-bold font-display text-[#173e33] text-xl dark:text-[#f7f4df]">
          {t("qc_reports_inspector_workload")}
        </h3>
        {report.inspectors.length === 0 ? (
          <EmptyReport>{t("qc_reports_no_data")}</EmptyReport>
        ) : (
          <ReportTable
            headers={[
              t("qc_inspector"),
              t("qc_reports_assigned"),
              t("qc_reports_submissions"),
              t("production_status_draft"),
              t("production_status_returned"),
              t("qc_reports_reviewed_sample"),
              t("qc_reports_first_pass_approval"),
              t("qc_reports_median_prepare_hhmm"),
            ]}
          >
            {report.inspectors.map((inspector) => (
              <tr className={rowClassName} key={inspector.id}>
                <td className={`${cellClassName} font-bold`}>
                  {inspector.name}
                </td>
                <td className={cellClassName}>{inspector.assigned}</td>
                <td className={cellClassName}>{inspector.submitted}</td>
                <td className={cellClassName}>{inspector.drafts}</td>
                <td className={cellClassName}>{inspector.returned}</td>
                <td className={cellClassName}>{inspector.reviewed}</td>
                <td className={cellClassName}>
                  {formatPercent(inspector.firstPassApprovalRate, locale)}
                </td>
                <td className={cellClassName}>
                  {formatDuration(inspector.medianCreateToSubmitMs, locale)}
                </td>
              </tr>
            ))}
          </ReportTable>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="px-1 font-bold font-display text-[#173e33] text-xl dark:text-[#f7f4df]">
          {t("qc_reports_reviewer_workload")}
        </h3>
        {report.reviewers.length === 0 ? (
          <EmptyReport>{t("qc_reports_no_review_decisions")}</EmptyReport>
        ) : (
          <ReportTable
            headers={[
              t("qc_reports_reviewer"),
              t("qc_reports_decisions"),
              t("qc_reports_approved"),
              t("qc_reports_returned"),
              t("qc_reports_median_review_hhmm"),
            ]}
          >
            {report.reviewers.map((reviewer) => (
              <tr className={rowClassName} key={reviewer.id}>
                <td className={`${cellClassName} font-bold`}>
                  {reviewer.name}
                </td>
                <td className={cellClassName}>{reviewer.decisions}</td>
                <td className={cellClassName}>{reviewer.approvals}</td>
                <td className={cellClassName}>{reviewer.returns}</td>
                <td className={cellClassName}>
                  {formatDuration(reviewer.medianReviewTimeMs, locale)}
                </td>
              </tr>
            ))}
          </ReportTable>
        )}
      </section>
      <p className="px-1 text-[#527568] text-xs dark:text-[#a9cbbb]">
        {t("qc_reports_workload_fairness_note")}
      </p>
    </div>
  );
}
