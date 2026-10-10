export const QUALITY_REPORT_SECTION_DEFINITIONS = [
  {
    defaultLabelKey: "qc_reports_section_summary",
    defaultTitleKey: "qc_reports_management_summary",
    key: "summary",
  },
  {
    defaultLabelKey: "qc_reports_section_operations",
    defaultTitleKey: "qc_reports_section_operations",
    key: "operations",
  },
  {
    defaultLabelKey: "qc_reports_section_quality",
    defaultTitleKey: "qc_reports_measurements",
    key: "quality",
  },
  {
    defaultLabelKey: "qc_reports_section_readiness",
    defaultTitleKey: "qc_reports_readiness",
    key: "readiness",
  },
  {
    defaultLabelKey: "qc_reports_section_comparison",
    defaultTitleKey: "qc_reports_comparison",
    key: "comparison",
  },
  {
    defaultLabelKey: "qc_reports_section_workflow",
    defaultTitleKey: "qc_reports_workflow",
    key: "workflow",
  },
  {
    defaultLabelKey: "qc_reports_section_laboratory",
    defaultTitleKey: "qc_reports_laboratory",
    key: "laboratory",
  },
] as const;

export type QualityReportSectionKey = (typeof QUALITY_REPORT_SECTION_DEFINITIONS)[number]["key"];

export const QUALITY_REPORT_SECTION_KEYS = QUALITY_REPORT_SECTION_DEFINITIONS.map(({ key }) => key);
