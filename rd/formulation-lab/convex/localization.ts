import type { Doc } from "./_generated/dataModel";

export type SupportedLanguage = "en" | "ar";

export interface LocalizedString {
  ar?: string;
  en?: string;
}

export const I18N_VERSION = 201;

export function normalizeLanguage(language?: string): SupportedLanguage {
  return language === "ar" ? "ar" : "en";
}

export function makeLocalizedString(
  legacyValue: string | undefined,
  localized?: LocalizedString
): LocalizedString {
  const fallback = legacyValue?.trim() || localized?.en || localized?.ar || "";
  const en = localized?.en?.trim() || fallback;
  const ar = localized?.ar?.trim() || en || fallback;
  return { en, ar };
}

export function selectLocalizedString(
  legacyValue: string | undefined,
  localized: LocalizedString | undefined,
  language?: string
) {
  const normalizedLanguage = normalizeLanguage(language);
  const fallback = legacyValue ?? localized?.en ?? localized?.ar ?? "";
  if (normalizedLanguage === "ar") {
    return localized?.ar || localized?.en || fallback;
  }
  return localized?.en || localized?.ar || fallback;
}

export function localizeArray(
  legacyValues: string[] | undefined,
  localizedValues: LocalizedString[] | undefined,
  language?: string
) {
  if (localizedValues && localizedValues.length > 0) {
    return localizedValues.map((value, index) =>
      selectLocalizedString(legacyValues?.[index], value, language)
    );
  }
  return legacyValues ?? [];
}

export function localizeDocumentField<
  T extends Record<string, unknown>,
  K extends keyof T & string,
>(document: T, field: K, language?: string) {
  const localizedField = `${field}I18n`;
  return {
    ...document,
    [field]: selectLocalizedString(
      document[field] as string | undefined,
      document[localizedField] as LocalizedString | undefined,
      language
    ),
  };
}

export function getProjectNameI18n(project?: Doc<"projects"> | null) {
  return makeLocalizedString(project?.name, project?.nameI18n);
}
