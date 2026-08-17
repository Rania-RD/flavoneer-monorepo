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
  ReportHeading,
  ReportLoading,
  ReportTable,
  rowClassName,
} from "./shared";
import type { QualityReportArgs } from "./types";

const requirementTranslationKeys: Record<string, string> = {
  batch_label_photo: "qc_reports_batch_label_photo",
  batch_code_confirmation: "qc_reports_batch_code_confirmation",
  required_measurements: "qc_reports_required_measurements",
  compliance_checks: "qc_reports_compliance_confirmations",
};

export function ReadinessReport({ args }: { args: QualityReportArgs }) {
  const { t, i18n } = useTranslation();
  const report = useQuery(api.qualityManagerReports.getReadiness, args);
  const locale = i18n.language === "ar" ? "ar-PS" : "en";
  if (report === undefined) {
    return <ReportLoading />;
  }

  return (
    <div className="space-y-7">
      <ReportHeading
        description={t("qc_reports_readiness_description")}
        title={t("qc_reports_readiness")}
      />
      <MetricStrip
        items={[
          {
            label: t("qc_reports_open_records"),
            value: report.totals.openRecords,
          },
          {
            label: t("qc_reports_photo_coverage"),
            value: formatPercent(report.totals.photoCoverage, locale),
          },
          {
            label: t("qc_reports_measurement_coverage"),
            value: formatPercent(report.totals.readingCoverage, locale),
          },
          {
            label: t("qc_reports_oldest_stalled_hhmm"),
            value: formatDuration(report.totals.oldestStalledAgeMs, locale),
            tone: report.totals.oldestStalledAgeMs ? "warning" : "default",
          },
        ]}
      />

      <div className="grid gap-px overflow-hidden rounded-[2.5rem] bg-[#1c4a3c]/10 sm:grid-cols-2 lg:grid-cols-4 dark:bg-[#d2f2d4]/10">
        {[
          [
            "qc_reports_batch_label_photo",
            report.missingRequirements.batchLabelPhoto,
          ],
          [
            "qc_reports_batch_code_confirmation",
            report.missingRequirements.batchCodeConfirmation,
          ],
          [
            "qc_reports_required_measurements",
            report.missingRequirements.requiredMeasurements,
          ],
          [
            "qc_reports_compliance_confirmations",
            report.missingRequirements.complianceChecks,
          ],
        ].map(([label, count]) => (
          <div
            className="bg-[#fffdf4] px-5 py-6 dark:bg-[#173e33]"
            key={String(label)}
          >
            <p className="font-bold text-[#527568] text-xs dark:text-[#a9cbbb]">
              {t(String(label))}
            </p>
            <p className="mt-2 font-bold font-display text-3xl text-[#173e33] dark:text-[#f7f4df]">
              {count}
            </p>
            <p className="mt-1 text-[#527568] text-xs dark:text-[#a9cbbb]">
              {t("qc_reports_awaiting_confirmation_not_failure")}
            </p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <h3 className="px-1 font-bold font-display text-[#173e33] text-xl dark:text-[#f7f4df]">
          {t("qc_reports_stalled_records")}
        </h3>
        {report.stalledRecords.length === 0 ? (
          <EmptyReport>{t("qc_reports_no_open_readiness_gaps")}</EmptyReport>
        ) : (
          <ReportTable
            headers={[
              t("form_serial"),
              t("product_label"),
              t("department_or_line"),
              t("qc_inspector"),
              t("status"),
              t("qc_reports_missing"),
              t("qc_reports_unchanged_hhmm"),
              t("qc_reports_updated"),
            ]}
          >
            {report.stalledRecords.map((row) => (
              <tr className={rowClassName} key={row.recordId}>
                <td className={`${cellClassName} font-bold font-mono`}>
                  <Link to={`/quality/production-line-records/${row.recordId}`}>
                    {row.displaySerial}
                  </Link>
                </td>
                <td className={cellClassName}>{row.productName}</td>
                <td className={cellClassName}>{row.departmentName}</td>
                <td className={cellClassName}>{row.qcUserName}</td>
                <td className={cellClassName}>
                  {t(`production_status_${row.status}`)}
                </td>
                <td className={cellClassName}>
                  <div className="flex max-w-sm flex-wrap gap-1.5">
                    {row.missing.map((key) => (
                      <span
                        className="rounded-full bg-[#fff4d9] px-2.5 py-1 text-[#8a5811] text-xs dark:bg-[#f5a623]/15 dark:text-[#ffc760]"
                        key={key}
                      >
                        {t(requirementTranslationKeys[key] ?? key)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className={cellClassName}>
                  {formatDuration(row.ageMs, locale)}
                </td>
                <td className={cellClassName}>
                  {formatDateTime(row.updatedAt, locale)}
                </td>
              </tr>
            ))}
          </ReportTable>
        )}
      </section>
    </div>
  );
}
