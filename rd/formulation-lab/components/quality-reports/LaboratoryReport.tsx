import { api } from "@flavoneer/backend/api";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  cellClassName,
  EmptyReport,
  formatDateTime,
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

export function LaboratoryReport({ args }: { args: QualityReportArgs }) {
  const { t, i18n } = useTranslation();
  const report = useQuery(api.qualityManagerReports.getLaboratoryQuality, args);
  const locale = i18n.language === "ar" ? "ar-PS" : "en";
  if (report === undefined) {
    return <ReportLoading />;
  }

  return (
    <div className="space-y-8">
      <ReportHeading
        description={t("qc_reports_laboratory_description")}
        title={t("qc_reports_laboratory")}
      />
      <MetricStrip
        items={[
          { label: t("qc_reports_lab_reports"), value: report.totals.reports },
          {
            label: t("qc_reports_test_conformance"),
            value: formatPercent(report.totals.testConformanceRate, locale),
          },
          {
            label: t("qc_reports_sample_coverage"),
            value: formatPercent(report.totals.sampleCoverageRate, locale),
          },
          {
            label: t("qc_reports_unreported_samples"),
            value: report.totals.unreportedSamples,
            tone: report.totals.unreportedSamples > 0 ? "warning" : "default",
          },
        ]}
      />

      <div className="grid gap-px overflow-hidden rounded-[2.5rem] bg-[#1c4a3c]/10 sm:grid-cols-3 dark:bg-[#d2f2d4]/10">
        {[
          [
            "qc_reports_sample_to_report_hhmm",
            report.totals.medianSampleToReportMs,
          ],
          [
            "qc_reports_sample_to_approval_hhmm",
            report.totals.medianSampleToApprovalMs,
          ],
          [
            "qc_reports_report_to_approval_hhmm",
            report.totals.medianReportToApprovalMs,
          ],
        ].map(([label, value]) => (
          <div
            className="bg-[#fffdf4] px-6 py-6 dark:bg-[#173e33]"
            key={String(label)}
          >
            <p className="font-bold text-[#527568] text-[10px] uppercase tracking-[0.12em] dark:text-[#a9cbbb]">
              {t(String(label))}
            </p>
            <p className="mt-2 font-bold font-display text-3xl text-[#173e33] dark:text-[#f7f4df]">
              {formatDuration(value as number | null, locale)}
            </p>
          </div>
        ))}
      </div>

      {report.unresolvedLegacyLinks > 0 ? (
        <p className="rounded-2xl bg-[#fff4d9] px-4 py-3 text-[#8a5811] text-sm dark:bg-[#f5a623]/15 dark:text-[#ffc760]">
          {t("qc_reports_unresolved_lab_links", {
            count: report.unresolvedLegacyLinks,
          })}
        </p>
      ) : null}

      <section className="border-[#1c4a3c]/10 border-y py-5 dark:border-[#d2f2d4]/10">
        <h3 className="px-1 font-bold text-[#173e33] text-sm dark:text-[#f7f4df]">
          {t("qc_reports_out_of_spec_parameters")}
        </h3>
        {report.parameters.length === 0 ? (
          <EmptyReport>{t("qc_reports_no_out_of_spec_tests")}</EmptyReport>
        ) : (
          <ReportChart
            className="mt-4 h-72"
            options={{
              axes: {
                x: { label: { fontSize: 10 }, type: "category" },
                y: {
                  label: {
                    fontSize: 10,
                    formatter: ({ value }) => `${Math.round(value)}`,
                  },
                  type: "number",
                },
              },
              data: report.parameters,
              legend: { enabled: false },
              padding: { bottom: 12, left: 8, right: 12, top: 12 },
              series: [
                {
                  cornerRadius: 7,
                  fill: REPORT_COLORS.red,
                  type: "bar",
                  xKey: "name",
                  yKey: "outOfSpec",
                  yName: t("qc_reports_out_of_spec_tests"),
                },
              ],
            }}
          />
        )}
      </section>

      <section className="space-y-4">
        <h3 className="px-1 font-bold font-display text-[#173e33] text-xl dark:text-[#f7f4df]">
          {t("qc_reports_unreported_final_product_samples")}
        </h3>
        {report.unreportedSamples.length === 0 ? (
          <EmptyReport>{t("qc_reports_all_samples_reported")}</EmptyReport>
        ) : (
          <ReportTable
            headers={[
              t("sample_number"),
              t("product_label"),
              t("batch_number"),
              t("sample_location"),
              t("sampled_at"),
              t("qc_reports_age_hhmm"),
              t("submitted_by"),
            ]}
          >
            {report.unreportedSamples.map((sample) => (
              <tr className={rowClassName} key={sample.sampleId}>
                <td className={`${cellClassName} font-bold font-mono`}>
                  {sample.sampleNumber}
                </td>
                <td className={cellClassName}>{sample.productName}</td>
                <td className={`${cellClassName} font-mono`}>
                  {sample.productionNumber}
                </td>
                <td className={cellClassName}>{sample.sampleLocation}</td>
                <td className={cellClassName}>
                  {formatDateTime(sample.sampledAt, locale)}
                </td>
                <td className={cellClassName}>
                  {formatDuration(sample.ageMs, locale)}
                </td>
                <td className={cellClassName}>{sample.submittedByName}</td>
              </tr>
            ))}
          </ReportTable>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="px-1 font-bold font-display text-[#173e33] text-xl dark:text-[#f7f4df]">
          {t("qc_reports_recent_lab_reports")}
        </h3>
        {report.recentReports.length === 0 ? (
          <EmptyReport>{t("qc_reports_no_data")}</EmptyReport>
        ) : (
          <ReportTable
            headers={[
              t("report_id"),
              t("sample_number"),
              t("product_label"),
              t("batch_number"),
              t("status"),
              t("qc_reports_out_of_spec_tests"),
              t("date"),
            ]}
          >
            {report.recentReports.map((labReport) => (
              <tr className={rowClassName} key={labReport.labReportId}>
                <td className={`${cellClassName} font-bold font-mono`}>
                  <Link to={`/reports/${labReport.labReportId}`}>
                    {labReport.reportId}
                  </Link>
                </td>
                <td className={`${cellClassName} font-mono`}>
                  {labReport.sampleNumber ?? "—"}
                </td>
                <td className={cellClassName}>{labReport.productName}</td>
                <td className={`${cellClassName} font-mono`}>
                  {labReport.lotNumber}
                </td>
                <td className={cellClassName}>
                  {t(`qc_reports_lab_status_${labReport.status.toLowerCase()}`)}
                </td>
                <td
                  className={`${cellClassName} ${labReport.outOfSpecTestCount ? "font-bold text-[#a43434] dark:text-[#ffb8ad]" : ""}`}
                >
                  {labReport.outOfSpecTestCount}
                </td>
                <td className={cellClassName}>
                  {formatDateTime(labReport.reportCreatedAt, locale)}
                </td>
              </tr>
            ))}
          </ReportTable>
        )}
      </section>
    </div>
  );
}
