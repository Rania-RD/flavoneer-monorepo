import { api } from "@flavoneer/backend/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  cellClassName,
  EmptyReport,
  formatDuration,
  formatPercent,
  MetricStrip,
  ReportHeading,
  ReportLoading,
  ReportTable,
  rowClassName,
} from "./shared";
import type { QualityReportArgs } from "./types";

const groupOptions = [
  "product",
  "hall",
  "department",
  "specification",
] as const;

export function ComparisonReport({ args }: { args: QualityReportArgs }) {
  const { t, i18n } = useTranslation();
  const [groupBy, setGroupBy] =
    useState<(typeof groupOptions)[number]>("product");
  const report = useQuery(api.qualityManagerReports.getComparisons, {
    ...args,
    groupBy,
  });
  const locale = i18n.language === "ar" ? "ar-PS" : "en";
  if (report === undefined) {
    return <ReportLoading />;
  }

  return (
    <div className="space-y-7">
      <ReportHeading
        action={
          <div className="flex flex-wrap gap-2">
            {groupOptions.map((option) => (
              <button
                className={`rounded-full px-4 py-2 font-bold text-xs transition-colors ${
                  groupBy === option
                    ? "bg-[#1c4a3c] text-white dark:bg-[#f5a623] dark:text-[#173e33]"
                    : "bg-[#eef8eb] text-[#527568] hover:bg-[#d2f2d4] dark:bg-[#285b4d] dark:text-[#a9cbbb]"
                }`}
                key={option}
                onClick={() => setGroupBy(option)}
                type="button"
              >
                {t(`qc_reports_group_${option}`)}
              </button>
            ))}
          </div>
        }
        description={t("qc_reports_comparison_description")}
        title={t("qc_reports_comparison")}
      />
      <MetricStrip
        items={[
          {
            label: t("qc_reports_inspections"),
            value: report.baseline.inspections,
          },
          {
            label: t("qc_reports_baseline_ool_rate"),
            value: formatPercent(report.baseline.outOfLimitRate, locale),
          },
          {
            label: t("qc_reports_reading_conformance"),
            value: formatPercent(
              report.baseline.readingConformanceRate,
              locale
            ),
          },
          {
            label: t("qc_reports_first_pass_approval"),
            value: formatPercent(report.baseline.firstPassApprovalRate, locale),
          },
        ]}
      />
      {report.groups.length === 0 ? (
        <EmptyReport>{t("qc_reports_no_data")}</EmptyReport>
      ) : (
        <ReportTable
          headers={[
            t(`qc_reports_group_${groupBy}`),
            t("qc_reports_inspections"),
            t("qc_reports_approved"),
            t("qc_reports_returned"),
            t("qc_reports_ool_record_rate"),
            t("qc_reports_reading_conformance"),
            t("qc_reports_first_pass_approval"),
            t("qc_reports_median_review_hhmm"),
          ]}
        >
          {report.groups.map((group) => (
            <tr className={rowClassName} key={group.key}>
              <td className={`${cellClassName} font-bold`}>
                <span>{group.label}</span>
                {group.lowSample ? (
                  <span className="ms-2 rounded-full bg-[#fff4d9] px-2 py-1 text-[#8a5811] text-[10px] dark:bg-[#f5a623]/15 dark:text-[#ffc760]">
                    {t("qc_reports_low_sample")}
                  </span>
                ) : null}
              </td>
              <td className={cellClassName}>{group.inspections}</td>
              <td className={cellClassName}>{group.approved}</td>
              <td className={cellClassName}>{group.returned}</td>
              <td
                className={`${cellClassName} ${group.lowSample ? "text-[#527568]" : "font-bold"}`}
              >
                {formatPercent(group.outOfLimitRate, locale)}
              </td>
              <td className={cellClassName}>
                {formatPercent(group.readingConformanceRate, locale)}
              </td>
              <td className={cellClassName}>
                {formatPercent(group.firstPassApprovalRate, locale)}
              </td>
              <td className={cellClassName}>
                {formatDuration(group.medianReviewTimeMs, locale)}
              </td>
            </tr>
          ))}
        </ReportTable>
      )}
    </div>
  );
}
