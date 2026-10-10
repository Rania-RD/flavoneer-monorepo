import { api } from "@flavoneer/backend/api";
import { pdf } from "@react-pdf/renderer";
import { useQuery } from "convex/react";
import {
  Download,
  FileSearch,
  Loader2,
  Printer,
  Settings2,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/useToast";
import { type ComparisonGroup, ComparisonReport } from "./ComparisonReport";
import { LaboratoryReport } from "./LaboratoryReport";
import { MeasurementReport } from "./MeasurementReport";
import { QualityManagerReportPdf } from "./manager-report-pdf";
import { OverviewReport } from "./OverviewReport";
import { QualityReportSectionsModal } from "./QualityReportSectionsModal";
import { ReadinessReport } from "./ReadinessReport";
import { resolveQualityReportSections } from "./report-sections";
import {
  formatDuration,
  formatPercent,
  KpiGrid,
  ReportLoading,
  ReportSection,
} from "./shared";
import type { QualityReportArgs, QualityReportProductOption } from "./types";
import { WorkflowReport } from "./WorkflowReport";

function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printPdf(blob: Blob) {
  return new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const frame = document.createElement("iframe");
    let cleanupTimer: number | undefined;
    let loadFallbackTimer: number | undefined;
    let printStarted = false;
    const cleanup = () => {
      if (cleanupTimer !== undefined) {
        window.clearTimeout(cleanupTimer);
      }
      if (loadFallbackTimer !== undefined) {
        window.clearTimeout(loadFallbackTimer);
      }
      frame.remove();
      URL.revokeObjectURL(url);
    };
    const startPrint = () => {
      if (printStarted) {
        return;
      }
      const printWindow = frame.contentWindow;
      if (!printWindow) {
        cleanup();
        reject(new Error("PDF print frame did not load"));
        return;
      }
      printStarted = true;
      if (loadFallbackTimer !== undefined) {
        window.clearTimeout(loadFallbackTimer);
      }
      printWindow.onafterprint = cleanup;
      cleanupTimer = window.setTimeout(cleanup, 60_000);
      printWindow.focus();
      printWindow.print();
      resolve();
    };

    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.inlineSize = "1px";
    frame.style.blockSize = "1px";
    frame.style.insetInlineEnd = "0";
    frame.style.insetBlockEnd = "0";
    frame.style.border = "0";
    frame.src = url;
    frame.onload = () => {
      window.setTimeout(startPrint, 150);
    };
    frame.onerror = () => {
      cleanup();
      reject(new Error("PDF print frame failed to load"));
    };
    document.body.appendChild(frame);
    loadFallbackTimer = window.setTimeout(startPrint, 2000);
  });
}

export function ManagerReport({
  args,
  onOpenAudit,
  products,
  timezone,
}: {
  args: QualityReportArgs;
  onOpenAudit: () => void;
  products?: QualityReportProductOption[];
  timezone: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-PS" : "en";
  const language = i18n.language === "ar" ? "ar" : "en";
  const { toast } = useToast();
  const [groupBy, setGroupBy] = useState<ComparisonGroup>("product");
  const [activeSection, setActiveSection] = useState("summary");
  const [sectionSettingsOpen, setSectionSettingsOpen] = useState(false);
  const [pdfAction, setPdfAction] = useState<"download" | "print" | null>(null);
  const report = useQuery(api.qualityManagerReports.getManagerReport, {
    ...args,
    groupBy,
  });
  const laboratory = useQuery(api.qualityManagerReports.getLaboratoryQuality, {
    from: args.from,
    now: args.now,
    organizationId: args.organizationId,
    productId: args.productId,
    to: args.to,
  });
  const sectionConfiguration = useQuery(api.qualityReportConfigurations.get, {
    organizationId: args.organizationId,
  });
  const resolvedSections = useMemo(
    () =>
      sectionConfiguration
        ? resolveQualityReportSections(
            sectionConfiguration.sections,
            language,
            t
          )
        : [],
    [language, sectionConfiguration, t]
  );
  const visibleSections = useMemo(
    () => resolvedSections.filter(({ visible }) => visible),
    [resolvedSections]
  );
  const reportReady =
    report !== undefined && sectionConfiguration !== undefined;

  const handlePdfAction = async (action: "download" | "print") => {
    if (!(report && laboratory) || pdfAction) {
      return;
    }
    setPdfAction(action);
    toast.info(t("qc_reports_preparing_pdf"));
    try {
      const blob = await pdf(
        <QualityManagerReportPdf
          from={args.from}
          generatedAt={Date.now()}
          groupBy={groupBy}
          laboratory={laboratory}
          language={language}
          locale={locale}
          report={report}
          sections={visibleSections.map(({ key, title }) => ({ key, title }))}
          timezone={timezone}
          to={args.to}
        />
      ).toBlob();
      if (action === "download") {
        const fromDate = new Date(args.from).toISOString().slice(0, 10);
        const toDate = new Date(args.to - 1).toISOString().slice(0, 10);
        downloadPdf(
          blob,
          `${t("qc_reports_pdf_filename")}-${fromDate}-${toDate}.pdf`
        );
        toast.success(t("qc_reports_pdf_exported"));
      } else {
        await printPdf(blob);
      }
    } catch (error) {
      console.error(error);
      toast.error(t("qc_reports_pdf_failed"));
    } finally {
      setPdfAction(null);
    }
  };

  useEffect(() => {
    if (!reportReady) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.1, 0.25] }
    );
    for (const { key } of visibleSections) {
      const section = document.getElementById(key);
      if (section) {
        observer.observe(section);
      }
    }
    return () => observer.disconnect();
  }, [reportReady, visibleSections]);

  useEffect(() => {
    if (
      visibleSections.length > 0 &&
      !visibleSections.some(({ key }) => key === activeSection)
    ) {
      setActiveSection(visibleSections[0].key);
    }
  }, [activeSection, visibleSections]);

  if (report === undefined || sectionConfiguration === undefined) {
    return <ReportLoading />;
  }

  const evidenceCoverage =
    report.readiness.totals.openRecords === 0
      ? null
      : (report.readiness.totals.photoCoverage +
          report.readiness.totals.codeCoverage +
          report.readiness.totals.readingCoverage +
          report.readiness.totals.checkCoverage) /
        4;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#1c4a3c]/12 bg-[#fffdf4] px-4 font-bold text-[#173e33] text-xs transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[#eef8eb] dark:border-[#d2f2d4]/12 dark:bg-[#173e33] dark:text-[#f7f4df] dark:hover:bg-[#285b4d]"
          onClick={() => setSectionSettingsOpen(true)}
          type="button"
        >
          <Settings2 aria-hidden="true" size={15} />
          {t("qc_reports_configure_sections")}
        </button>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#1c4a3c]/12 bg-[#fffdf4] px-4 font-bold text-[#173e33] text-xs transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[#eef8eb] disabled:cursor-wait disabled:opacity-60 dark:border-[#d2f2d4]/12 dark:bg-[#173e33] dark:text-[#f7f4df] dark:hover:bg-[#285b4d]"
          disabled={laboratory === undefined || pdfAction !== null}
          onClick={() => handlePdfAction("download")}
          type="button"
        >
          {pdfAction === "download" ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={15} />
          ) : (
            <Download aria-hidden="true" size={15} />
          )}
          {t("qc_reports_export_pdf")}
        </button>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1c4a3c] px-4 font-bold text-white text-xs shadow-[0_8px_22px_rgba(28,74,60,0.16)] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 dark:bg-[#f5a623] dark:text-[#173e33]"
          disabled={laboratory === undefined || pdfAction !== null}
          onClick={() => handlePdfAction("print")}
          type="button"
        >
          {pdfAction === "print" ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={15} />
          ) : (
            <Printer aria-hidden="true" size={15} />
          )}
          {t("qc_reports_print")}
        </button>
      </div>

      <nav
        aria-label={t("qc_reports_section_navigation")}
        className="sticky top-3 z-20 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-[#1c4a3c]/10 bg-[#fffdf4]/95 p-1.5 shadow-[0_10px_30px_rgba(16,47,39,0.08)] backdrop-blur dark:border-[#d2f2d4]/10 dark:bg-[#173e33]/95"
      >
        {visibleSections.map(({ key, label }) => (
          <a
            aria-current={activeSection === key ? "location" : undefined}
            className={`shrink-0 rounded-xl px-3 py-2 font-bold text-xs transition-colors ${
              activeSection === key
                ? "bg-[#eef8eb] text-[#173e33] dark:bg-[#285b4d] dark:text-[#f7f4df]"
                : "text-[#527568] hover:bg-[#eef8eb] hover:text-[#173e33] dark:text-[#a9cbbb] dark:hover:bg-[#285b4d] dark:hover:text-[#f7f4df]"
            }`}
            href={`#${key}`}
            key={key}
            onClick={() => setActiveSection(key)}
          >
            {label}
          </a>
        ))}
        <button
          className="ms-auto flex shrink-0 items-center gap-2 rounded-xl bg-[#1c4a3c] px-3 py-2 font-bold text-white text-xs transition-transform hover:-translate-y-0.5 dark:bg-[#f5a623] dark:text-[#173e33]"
          onClick={onOpenAudit}
          type="button"
        >
          <FileSearch aria-hidden="true" size={14} />
          {t("qc_reports_open_audit")}
        </button>
      </nav>

      {visibleSections.map((section): ReactNode => {
        switch (section.key) {
          case "summary":
            return (
              <section
                className="scroll-mt-36 space-y-6"
                id="summary"
                key="summary"
              >
                <h2 className="font-bold font-display text-2xl text-[#173e33] tracking-tight sm:text-3xl dark:text-[#f7f4df]">
                  {section.title}
                </h2>
                <KpiGrid
                  items={[
                    {
                      label: t("qc_reports_inspections"),
                      supporting: t("qc_reports_inspection_outcomes", {
                        approved: report.overview.totals.approved,
                        returned: report.overview.totals.returned,
                      }),
                      value: report.overview.totals.inspections,
                    },
                    {
                      label: t("qc_reports_pending_queue"),
                      supporting: t("qc_reports_pending_support", {
                        duration: formatDuration(
                          report.overview.totals.oldestPendingAgeMs,
                          locale
                        ),
                      }),
                      tone:
                        report.overview.totals.pending > 0 ? "warning" : "good",
                      value: report.overview.totals.pending,
                    },
                    {
                      label: t("qc_reports_out_of_limit_records"),
                      supporting: t("qc_reports_ool_rate_support", {
                        rate: formatPercent(
                          report.comparison.baseline.outOfLimitRate,
                          locale
                        ),
                      }),
                      tone:
                        report.overview.totals.outOfLimitRecords > 0
                          ? "danger"
                          : "good",
                      value: report.overview.totals.outOfLimitRecords,
                    },
                    {
                      label: t("qc_reports_reading_conformance"),
                      supporting: t("qc_reports_across_stored_readings"),
                      value: formatPercent(
                        report.comparison.baseline.readingConformanceRate,
                        locale
                      ),
                    },
                    {
                      label: t("qc_reports_evidence_coverage"),
                      supporting: t("qc_reports_open_records_support", {
                        count: report.readiness.totals.openRecords,
                      }),
                      value:
                        evidenceCoverage === null
                          ? "—"
                          : formatPercent(evidenceCoverage, locale),
                    },
                    {
                      label: t("qc_reports_first_pass_approval"),
                      supporting: t("qc_reports_first_review_support"),
                      value: formatPercent(
                        report.comparison.baseline.firstPassApprovalRate,
                        locale
                      ),
                    },
                    {
                      label: t("qc_reports_median_review_hhmm"),
                      supporting: t("qc_reports_review_time_support"),
                      value: formatDuration(
                        report.workflow.totals.medianReviewTimeMs,
                        locale
                      ),
                    },
                    {
                      label: t("qc_reports_unreported_samples"),
                      supporting:
                        laboratory === undefined
                          ? t("loading")
                          : t("qc_reports_lab_coverage_support", {
                              rate:
                                laboratory.totals.sampledFinalProducts === 0
                                  ? "—"
                                  : formatPercent(
                                      laboratory.totals.sampleCoverageRate,
                                      locale
                                    ),
                            }),
                      tone:
                        laboratory && laboratory.totals.unreportedSamples > 0
                          ? "warning"
                          : "good",
                      value: laboratory?.totals.unreportedSamples ?? "—",
                    },
                  ]}
                />
              </section>
            );

          case "operations":
            return (
              <ReportSection
                id="operations"
                key="operations"
                title={section.title}
              >
                <OverviewReport args={args} data={report.overview} embedded />
              </ReportSection>
            );

          case "quality":
            return (
              <ReportSection id="quality" key="quality" title={section.title}>
                <MeasurementReport
                  args={args}
                  embedded
                  key={args.productId ?? "all-products"}
                  products={products}
                />
              </ReportSection>
            );

          case "readiness":
            return (
              <ReportSection
                id="readiness"
                key="readiness"
                title={section.title}
              >
                <ReadinessReport args={args} data={report.readiness} embedded />
              </ReportSection>
            );

          case "comparison":
            return (
              <ReportSection
                id="comparison"
                key="comparison"
                title={section.title}
              >
                <ComparisonReport
                  args={args}
                  data={report.comparison}
                  embedded
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                />
              </ReportSection>
            );

          case "workflow":
            return (
              <ReportSection id="workflow" key="workflow" title={section.title}>
                <WorkflowReport args={args} data={report.workflow} embedded />
              </ReportSection>
            );

          case "laboratory":
            return (
              <ReportSection
                description={t("qc_reports_laboratory_scoped_description")}
                id="laboratory"
                key="laboratory"
                title={section.title}
              >
                {laboratory === undefined ? (
                  <ReportLoading />
                ) : (
                  <LaboratoryReport args={args} data={laboratory} embedded />
                )}
              </ReportSection>
            );
          default:
            return null;
        }
      })}

      <QualityReportSectionsModal
        isOpen={sectionSettingsOpen}
        language={language}
        onClose={() => setSectionSettingsOpen(false)}
        organizationId={args.organizationId}
        sections={sectionConfiguration.sections}
      />
    </div>
  );
}
