import type { api } from "@flavoneer/backend/api";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { FunctionReturnType } from "convex/server";
import i18n from "../../lib/i18n";

type ManagerReportData = FunctionReturnType<
  typeof api.qualityManagerReports.getManagerReport
>;
type LaboratoryReportData = FunctionReturnType<
  typeof api.qualityManagerReports.getLaboratoryQuality
>;

const colors = {
  amber: "#f5a623",
  border: "#dce7df",
  cream: "#fffdf4",
  forest: "#173e33",
  mint: "#eef8eb",
  muted: "#527568",
  red: "#a43434",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.white,
    color: colors.forest,
    fontFamily: "Helvetica",
    fontSize: 8,
    paddingBottom: 80,
    paddingHorizontal: 34,
    paddingTop: 34,
  },
  titleBlock: {
    backgroundColor: colors.forest,
    borderRadius: 10,
    color: colors.cream,
    marginBottom: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  eyebrow: {
    color: "#a9cbbb",
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.3,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { color: "#c9ddcf", fontSize: 8, marginTop: 5 },
  metaRow: {
    display: "flex",
    flexDirection: "row",
    gap: 18,
    marginTop: 11,
  },
  metaItem: { flexGrow: 1 },
  metaLabel: {
    color: "#a9cbbb",
    fontSize: 6,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  metaValue: { color: colors.cream, fontSize: 8, marginTop: 2 },
  section: { marginBottom: 18 },
  sectionTitle: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 9,
    paddingBottom: 5,
  },
  metricGrid: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    overflow: "hidden",
  },
  metric: {
    backgroundColor: colors.cream,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: 9,
    width: "25%",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metricValue: { fontSize: 14, fontWeight: 700, marginTop: 4 },
  table: {
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%",
  },
  tableRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    minHeight: 22,
    width: "100%",
  },
  tableHeader: { backgroundColor: colors.mint },
  tableLine: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tableHeaderText: { fontSize: 6, fontWeight: 700 },
  danger: { color: colors.red, fontWeight: 700 },
  empty: {
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    color: colors.muted,
    padding: 12,
    textAlign: "center",
  },
});

function percent(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function duration(value: number | null, locale: string) {
  if (value === null) {
    return "-";
  }
  const totalMinutes = Math.round(value / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 }).format(hours)}:${new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 }).format(minutes)}`;
}

function dateTime(value: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function MetricGrid({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <View style={styles.metricGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.metric}>
          <Text style={styles.metricLabel}>{item.label}</Text>
          <Text style={styles.metricValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function ReportTable({
  emptyLabel,
  headers,
  rows,
}: {
  emptyLabel: string;
  headers: string[];
  rows: { dangerColumns?: number[]; values: (string | number)[] }[];
}) {
  if (rows.length === 0) {
    return <Text style={styles.empty}>{emptyLabel}</Text>;
  }
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeader]} wrap={false}>
        <Text style={[styles.tableLine, styles.tableHeaderText]}>
          {headers.join("  |  ")}
        </Text>
      </View>
      {rows.map((row, rowIndex) => (
        <View
          key={`${row.values.join("-")}-${rowIndex.toString()}`}
          style={styles.tableRow}
          wrap={false}
        >
          <Text style={styles.tableLine}>
            {row.values.map((value, columnIndex) => (
              <Text
                key={`${columnIndex.toString()}-${String(value)}`}
                style={
                  row.dangerColumns?.includes(columnIndex)
                    ? styles.danger
                    : undefined
                }
              >
                {`${columnIndex === 0 ? "" : "  |  "}${String(value)}`}
              </Text>
            ))}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function QualityManagerReportPdf({
  from,
  generatedAt,
  groupBy,
  laboratory,
  language,
  locale,
  report,
  timezone,
  to,
}: {
  from: number;
  generatedAt: number;
  groupBy: "product" | "hall" | "department" | "specification";
  laboratory: LaboratoryReportData;
  language: string;
  locale: string;
  report: ManagerReportData;
  timezone: string;
  to: number;
}) {
  const t = i18n.getFixedT(language);
  const coverage =
    report.readiness.totals.openRecords === 0
      ? "-"
      : percent(
          (report.readiness.totals.photoCoverage +
            report.readiness.totals.codeCoverage +
            report.readiness.totals.readingCoverage +
            report.readiness.totals.checkCoverage) /
            4,
          locale
        );
  const pageTextAlign = language === "ar" ? "right" : "left";
  const period = `${dateTime(from, locale)} - ${dateTime(to - 1, locale)}`;
  const missingRequirementLabels: Record<string, string> = {
    batch_code_confirmation: t("qc_reports_batch_code_confirmation"),
    batch_label_photo: t("qc_reports_batch_label_photo"),
    compliance_checks: t("qc_reports_compliance_confirmations"),
    required_measurements: t("qc_reports_required_measurements"),
  };

  return (
    <Document
      author="Flavoneer"
      subject={t("qc_reports_management_summary")}
      title={t("qc_reports_title")}
    >
      <Page size="A4" style={[styles.page, { textAlign: pageTextAlign }]} wrap>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>{t("quality_control")}</Text>
          <Text style={styles.title}>{t("qc_reports_title")}</Text>
          <Text style={styles.subtitle}>{t("qc_reports_subtitle")}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>
                {t("qc_reports_reporting_period")}
              </Text>
              <Text style={styles.metaValue}>{period}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>
                {t("qc_reports_generated_at")}
              </Text>
              <Text style={styles.metaValue}>
                {dateTime(generatedAt, locale)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t("timezone")}</Text>
              <Text style={styles.metaValue}>{timezone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("qc_reports_management_summary")}
          </Text>
          <MetricGrid
            items={[
              {
                label: t("qc_reports_inspections"),
                value: report.overview.totals.inspections,
              },
              {
                label: t("qc_reports_pending_queue"),
                value: report.overview.totals.pending,
              },
              {
                label: t("qc_reports_out_of_limit_records"),
                value: report.overview.totals.outOfLimitRecords,
              },
              {
                label: t("qc_reports_reading_conformance"),
                value: percent(
                  report.comparison.baseline.readingConformanceRate,
                  locale
                ),
              },
              { label: t("qc_reports_evidence_coverage"), value: coverage },
              {
                label: t("qc_reports_first_pass_approval"),
                value: percent(
                  report.comparison.baseline.firstPassApprovalRate,
                  locale
                ),
              },
              {
                label: t("qc_reports_median_review_hhmm"),
                value: duration(
                  report.workflow.totals.medianReviewTimeMs,
                  locale
                ),
              },
              {
                label: t("qc_reports_unreported_samples"),
                value: laboratory.totals.unreportedSamples,
              },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("qc_reports_section_operations")}
          </Text>
          <MetricGrid
            items={[
              {
                label: t("qc_reports_inspections"),
                value: report.overview.totals.inspections,
              },
              {
                label: t("qc_reports_approved"),
                value: report.overview.totals.approved,
              },
              {
                label: t("qc_reports_pending_queue"),
                value: report.overview.totals.pending,
              },
              {
                label: t("qc_reports_returned"),
                value: report.overview.totals.returned,
              },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("qc_reports_action_queue")}
          </Text>
          <ReportTable
            emptyLabel={t("qc_reports_no_exceptions")}
            headers={[
              t("form_serial"),
              t("product_label"),
              t("qc_reports_exception"),
              t("status"),
            ]}
            rows={report.overview.exceptions.map((item) => ({
              dangerColumns: item.outOfLimitReadingCount > 0 ? [2] : [],
              values: [
                item.displaySerial,
                item.productName,
                item.outOfLimitReadingCount,
                t(`production_status_${item.status}`),
              ],
            }))}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("qc_reports_readiness")}</Text>
          <MetricGrid
            items={[
              {
                label: t("qc_reports_open_records"),
                value: report.readiness.totals.openRecords,
              },
              {
                label: t("qc_reports_photo_coverage"),
                value: percent(report.readiness.totals.photoCoverage, locale),
              },
              {
                label: t("qc_reports_measurement_coverage"),
                value: percent(report.readiness.totals.readingCoverage, locale),
              },
              {
                label: t("qc_reports_oldest_stalled_hhmm"),
                value: duration(
                  report.readiness.totals.oldestStalledAgeMs,
                  locale
                ),
              },
              {
                label: t("qc_reports_batch_label_photo"),
                value: report.readiness.missingRequirements.batchLabelPhoto,
              },
              {
                label: t("qc_reports_batch_code_confirmation"),
                value:
                  report.readiness.missingRequirements.batchCodeConfirmation,
              },
              {
                label: t("qc_reports_required_measurements"),
                value:
                  report.readiness.missingRequirements.requiredMeasurements,
              },
              {
                label: t("qc_reports_compliance_confirmations"),
                value: report.readiness.missingRequirements.complianceChecks,
              },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("qc_reports_stalled_records")}
          </Text>
          <ReportTable
            emptyLabel={t("qc_reports_no_open_readiness_gaps")}
            headers={[
              t("form_serial"),
              t("product_label"),
              t("qc_reports_missing"),
              t("qc_reports_unchanged_hhmm"),
            ]}
            rows={report.readiness.stalledRecords.map((item) => ({
              values: [
                item.displaySerial,
                item.productName,
                item.missing
                  .map((key) => missingRequirementLabels[key] ?? key)
                  .join(", "),
                duration(item.ageMs, locale),
              ],
            }))}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("qc_reports_comparison")}</Text>
          <ReportTable
            emptyLabel={t("qc_reports_no_data")}
            headers={[
              t(`qc_reports_group_${groupBy}`),
              t("qc_reports_inspections"),
              t("qc_reports_ool_record_rate"),
              t("qc_reports_reading_conformance"),
              t("qc_reports_first_pass_approval"),
            ]}
            rows={report.comparison.groups.map((group) => ({
              dangerColumns: group.outOfLimitRecords > 0 ? [2] : [],
              values: [
                group.label,
                group.inspections,
                percent(group.outOfLimitRate, locale),
                percent(group.readingConformanceRate, locale),
                percent(group.firstPassApprovalRate, locale),
              ],
            }))}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("qc_reports_inspector_workload")}
          </Text>
          <ReportTable
            emptyLabel={t("qc_reports_no_data")}
            headers={[
              t("qc_inspector"),
              t("qc_reports_assigned"),
              t("qc_reports_submissions"),
              t("qc_reports_returned"),
              t("qc_reports_first_pass_approval"),
            ]}
            rows={report.workflow.inspectors.map((item) => ({
              values: [
                item.name,
                item.assigned,
                item.submitted,
                item.returned,
                percent(item.firstPassApprovalRate, locale),
              ],
            }))}
          />
        </View>

        <View break style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("qc_reports_reviewer_workload")}
          </Text>
          <ReportTable
            emptyLabel={t("qc_reports_no_review_decisions")}
            headers={[
              t("qc_reports_reviewer"),
              t("qc_reports_decisions"),
              t("qc_reports_approved"),
              t("qc_reports_returned"),
              t("qc_reports_median_review_hhmm"),
            ]}
            rows={report.workflow.reviewers.map((item) => ({
              values: [
                item.name,
                item.decisions,
                item.approvals,
                item.returns,
                duration(item.medianReviewTimeMs, locale),
              ],
            }))}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("qc_reports_laboratory")}</Text>
          <MetricGrid
            items={[
              {
                label: t("qc_reports_lab_reports"),
                value: laboratory.totals.reports,
              },
              {
                label: t("qc_reports_test_conformance"),
                value: percent(laboratory.totals.testConformanceRate, locale),
              },
              {
                label: t("qc_reports_sample_coverage"),
                value: percent(laboratory.totals.sampleCoverageRate, locale),
              },
              {
                label: t("qc_reports_unreported_samples"),
                value: laboratory.totals.unreportedSamples,
              },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("qc_reports_recent_lab_reports")}
          </Text>
          <ReportTable
            emptyLabel={t("qc_reports_no_data")}
            headers={[
              t("report_id"),
              t("product_label"),
              t("batch_number"),
              t("status"),
              t("qc_reports_out_of_spec_tests"),
            ]}
            rows={laboratory.recentReports.map((item) => ({
              dangerColumns: item.outOfSpecTestCount > 0 ? [4] : [],
              values: [
                item.reportId,
                item.productName,
                item.lotNumber,
                t(`qc_reports_lab_status_${item.status.toLowerCase()}`),
                item.outOfSpecTestCount,
              ],
            }))}
          />
        </View>
      </Page>
    </Document>
  );
}
