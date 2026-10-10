import {
  QUALITY_REPORT_SECTION_DEFINITIONS,
  type QualityReportSectionKey,
} from "@flavoneer/backend/quality-report-sections";
import type { TFunction } from "i18next";

export interface QualityReportSectionConfiguration {
  key: QualityReportSectionKey;
  labelI18n: { ar?: string; en?: string };
  visible: boolean;
}

export interface ResolvedQualityReportSection
  extends QualityReportSectionConfiguration {
  label: string;
  title: string;
}

export function createDefaultQualityReportSections(): QualityReportSectionConfiguration[] {
  return QUALITY_REPORT_SECTION_DEFINITIONS.map(({ key }) => ({
    key,
    labelI18n: {},
    visible: true,
  }));
}

export function resolveQualityReportSections(
  sections: QualityReportSectionConfiguration[],
  language: "ar" | "en",
  t: TFunction
): ResolvedQualityReportSection[] {
  const definitions = new Map(
    QUALITY_REPORT_SECTION_DEFINITIONS.map((definition) => [
      definition.key,
      definition,
    ])
  );

  return sections.flatMap((section) => {
    const definition = definitions.get(section.key);
    if (!definition) {
      return [];
    }
    const customLabel = section.labelI18n[language]?.trim();
    return [
      {
        ...section,
        label: customLabel || t(definition.defaultLabelKey),
        title: customLabel || t(definition.defaultTitleKey),
      },
    ];
  });
}
