import { api } from "@flavoneer/backend/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  cellClassName,
  EmptyReport,
  formatDateTime,
  formatPercent,
  formatReading,
  MetricStrip,
  REPORT_COLORS,
  ReportChart,
  ReportHeading,
  ReportLoading,
  ReportTable,
  rowClassName,
} from "./shared";
import type { QualityReportArgs } from "./types";

const readingKeys = [
  "pour_weight",
  "additive_weight",
  "chocolate_temperature",
  "coated_piece_weight",
  "carton_weight",
] as const;

export function MeasurementReport({ args }: { args: QualityReportArgs }) {
  const { t, i18n } = useTranslation();
  const [readingKey, setReadingKey] = useState<(typeof readingKeys)[number]>(
    readingKeys[0]
  );
  const report = useQuery(api.qualityManagerReports.getMeasurementConformance, {
    ...args,
    readingKey,
  });
  const locale = i18n.language === "ar" ? "ar-PS" : "en";
  if (report === undefined) {
    return <ReportLoading />;
  }
  const chartPoints = report.points.map((point, index) => ({
    ...point,
    maximum: Number(point.maximum.toFixed(1)),
    minimum: Number(point.minimum.toFixed(1)),
    sequence: index + 1,
    target:
      point.target === undefined ? undefined : Number(point.target.toFixed(1)),
    value: Number(point.value.toFixed(1)),
  }));
  const firstPoint = chartPoints[0];
  const chartMinimum = firstPoint
    ? Math.min(firstPoint.minimum, ...chartPoints.map((point) => point.value)) -
      0.2
    : undefined;
  const chartMaximum = firstPoint
    ? Math.max(firstPoint.maximum, ...chartPoints.map((point) => point.value)) +
      0.2
    : undefined;

  return (
    <div className="space-y-7">
      <ReportHeading
        action={
          <select
            aria-label={t("qc_reports_parameter")}
            className="min-h-11 rounded-2xl border border-[#1c4a3c]/10 bg-[#fffdf4] px-4 text-[#173e33] text-sm dark:border-[#d2f2d4]/10 dark:bg-[#173e33] dark:text-[#f7f4df]"
            onChange={(event) =>
              setReadingKey(event.target.value as typeof readingKey)
            }
            value={readingKey}
          >
            {readingKeys.map((key) => (
              <option key={key} value={key}>
                {t(`production_reading_${key}`)}
              </option>
            ))}
          </select>
        }
        description={t("qc_reports_measurements_description")}
        title={t("qc_reports_measurements")}
      />
      <MetricStrip
        items={[
          {
            label: t("qc_reports_total_readings"),
            value: report.totals.readings,
          },
          {
            label: t("qc_reports_reading_conformance"),
            value: formatPercent(report.totals.conformanceRate, locale),
          },
          {
            label: t("qc_reports_out_of_limit"),
            value: report.totals.outOfLimit,
            tone: report.totals.outOfLimit > 0 ? "danger" : "default",
          },
          {
            label: t("qc_reports_observed_cpk"),
            value: report.cpk === null ? "—" : report.cpk.toFixed(2),
          },
        ]}
      />

      {chartPoints.length === 0 ? (
        <EmptyReport>{t("qc_reports_no_data")}</EmptyReport>
      ) : (
        <section className="border-[#1c4a3c]/10 border-y py-5 dark:border-[#d2f2d4]/10">
          <ReportChart
            className="h-80"
            options={{
              axes: {
                x: {
                  label: { fontSize: 10 },
                  type: "number",
                },
                y: {
                  crossLines: firstPoint
                    ? [
                        {
                          label: { text: t("minimum") },
                          lineDash: [5, 4],
                          stroke: REPORT_COLORS.red,
                          type: "line",
                          value: firstPoint.minimum,
                        },
                        {
                          label: { text: t("maximum") },
                          lineDash: [5, 4],
                          stroke: REPORT_COLORS.red,
                          type: "line",
                          value: firstPoint.maximum,
                        },
                        ...(firstPoint.target === undefined
                          ? []
                          : [
                              {
                                label: { text: t("target") },
                                lineDash: [3, 3],
                                stroke: REPORT_COLORS.amber,
                                type: "line" as const,
                                value: firstPoint.target,
                              },
                            ]),
                      ]
                    : [],
                  label: { fontSize: 10 },
                  max: chartMaximum,
                  min: chartMinimum,
                  type: "number",
                },
              },
              data: chartPoints,
              legend: { enabled: false },
              padding: { bottom: 12, left: 12, right: 18, top: 12 },
              series: [
                {
                  marker: { size: 4 },
                  stroke: REPORT_COLORS.forest,
                  strokeWidth: 2,
                  type: "line",
                  xKey: "sequence",
                  yKey: "value",
                  yName: t("qc_reports_actual_value"),
                },
              ],
            }}
          />
        </section>
      )}

      <section className="space-y-4">
        <h3 className="px-1 font-bold font-display text-[#173e33] text-xl dark:text-[#f7f4df]">
          {t("qc_reports_outlier_records")}
        </h3>
        {report.outliers.length === 0 ? (
          <EmptyReport>{t("qc_reports_no_outliers")}</EmptyReport>
        ) : (
          <ReportTable
            headers={[
              t("form_serial"),
              t("qc_reports_parameter"),
              t("qc_reports_actual_value"),
              t("qc_reports_stored_limits"),
              t("qc_reports_distance_beyond"),
              t("inspection_time"),
            ]}
          >
            {report.outliers.map((row) => (
              <tr
                className={rowClassName}
                key={`${row.recordId}-${row.readingKey}-${row.readingIndex}`}
              >
                <td className={`${cellClassName} font-bold font-mono`}>
                  <Link to={`/quality/production-line-records/${row.recordId}`}>
                    {row.displaySerial}
                  </Link>
                </td>
                <td className={cellClassName}>
                  {t(`production_reading_${row.readingKey}`)}
                </td>
                <td
                  className={`${cellClassName} font-bold text-[#a43434] dark:text-[#ffb8ad]`}
                >
                  {formatReading(row.value, locale)} {row.unit}
                </td>
                <td className={cellClassName}>
                  {formatReading(row.minimum, locale)}–
                  {formatReading(row.maximum, locale)} {row.unit}
                </td>
                <td className={cellClassName}>
                  {row.distanceBeyondLimit > 0 ? "+" : ""}
                  {formatReading(row.distanceBeyondLimit, locale)} {row.unit}
                </td>
                <td className={cellClassName}>
                  {formatDateTime(row.inspectionAt, locale)}
                </td>
              </tr>
            ))}
          </ReportTable>
        )}
      </section>
    </div>
  );
}
