import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type React from "react";
import { useTranslation } from "react-i18next";
import type { EnrichedLabReport } from "../types";

// Create Document Component
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 40,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  section: {
    margin: 10,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    backgroundColor: "#F3F4F6",
    padding: 5,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 8,
  },
  label: {
    width: "40%",
    fontSize: 10,
    fontWeight: "bold",
    color: "#4B5563",
  },
  value: {
    width: "60%",
    fontSize: 10,
    color: "#1f2937",
  },
  table: {
    display: "flex",
    width: "auto",
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableHeader: {
    backgroundColor: "#F9FAFB",
    padding: 8,
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
  },
  tableCol: {
    padding: 8,
    fontSize: 10,
  },
  col1: { width: "25%" },
  col2: { width: "20%" },
  col3: { width: "25%" },
  col4: { width: "15%" },
  col5: { width: "15%" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 10,
    color: "#9CA3AF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },
  badgePass: {
    color: "#059669",
    fontWeight: "bold",
  },
  badgeFail: {
    color: "#DC2626",
    fontWeight: "bold",
  },
  signoffContainer: {
    marginTop: 40,
    alignItems: "flex-end",
  },
  signoffLine: {
    borderTopWidth: 1,
    borderTopColor: "#4F46E5",
    width: 200,
    paddingTop: 5,
    marginTop: 40,
    alignItems: "center",
  },
  signoffText: {
    fontSize: 8,
    color: "#6B7280",
    textTransform: "uppercase",
  },
  signoffSignature: {
    fontSize: 16,
    color: "#312E81",
    marginBottom: 5,
  },
});

interface ReportPDFProps {
  report: EnrichedLabReport;
  runBatchCode?: string;
}

export const ReportPDF: React.FC<ReportPDFProps> = ({
  report,
  runBatchCode,
}) => {
  const { t } = useTranslation();
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {report.projectName || t("unnamed_formulation")}
          </Text>
          <Text style={styles.subtitle}>
            {t("report_id")} {report._id}
          </Text>
          <Text style={styles.subtitle}>
            {t("date")} {report.date}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("general_information")}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t("lot_number")}</Text>
            <Text style={styles.value}>{report.lotNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("version")}</Text>
            <Text style={styles.value}>v{report.version}</Text>
          </View>
          {runBatchCode && (
            <View style={styles.row}>
              <Text style={styles.label}>{t("batch_code")}</Text>
              <Text style={styles.value}>{runBatchCode}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>{t("lead_chemist")}</Text>
            <Text style={styles.value}>{report.leadChemist}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("sample_type")}</Text>
            <Text style={styles.value}>{report.sampleType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("status")}</Text>
            <Text style={styles.value}>{report.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("analytical_results")}</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={[styles.tableHeader, styles.col1]}>
                {t("parameter")}
              </Text>
              <Text style={[styles.tableHeader, styles.col2]}>
                {t("method")}
              </Text>
              <Text style={[styles.tableHeader, styles.col3]}>
                {t("target")}
              </Text>
              <Text style={[styles.tableHeader, styles.col4]}>
                {t("result")}
              </Text>
              <Text style={[styles.tableHeader, styles.col5]}>{t("eval")}</Text>
            </View>
            {report.results.map((res, i) => {
              const isPass =
                res.actualValue >= res.min && res.actualValue <= res.max;
              return (
                <View key={i.toString()} style={styles.tableRow}>
                  <Text style={[styles.tableCol, styles.col1]}>
                    {res.parameter}
                  </Text>
                  <Text style={[styles.tableCol, styles.col2]}>
                    {res.method}
                  </Text>
                  <Text style={[styles.tableCol, styles.col3]}>
                    {res.targetRange}
                  </Text>
                  <Text style={[styles.tableCol, styles.col4]}>
                    {res.actualValue} {res.unit}
                  </Text>
                  <Text
                    style={[
                      styles.tableCol,
                      styles.col5,
                      isPass ? styles.badgePass : styles.badgeFail,
                    ]}
                  >
                    {isPass ? t("pass") : t("fail")}
                  </Text>
                </View>
              );
            })}
            {report.results.length === 0 && (
              <View style={styles.tableRow}>
                <Text style={{ padding: 10, fontSize: 10, color: "#6B7280" }}>
                  {t("no_test_results_recorded")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {report.status === "Approved" && report.signoffData && (
          <View style={styles.signoffContainer}>
            <View style={styles.signoffLine}>
              <Text style={styles.signoffSignature}>{report.signoffData}</Text>
              <Text style={styles.signoffText}>
                {t("electronically_signed_by")}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text>{t("food_r_d_lab_official_quality_control_do")}</Text>
        </View>
      </Page>
    </Document>
  );
};
