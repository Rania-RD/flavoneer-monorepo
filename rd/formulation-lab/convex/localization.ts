import type { Doc } from "./_generated/dataModel";

export type SupportedLanguage = "en" | "ar";

export interface LocalizedString {
  ar?: string;
  en?: string;
}

export const I18N_VERSION = 201;
const QUESTION_MARK_RUN_REGEX = /\?{3,}/;
const MOJIBAKE_REGEX = /(?:Ø|Ù|�)/;

export function isCorruptedLocalizedText(value?: string | null) {
  if (!value) {
    return false;
  }
  return QUESTION_MARK_RUN_REGEX.test(value) || MOJIBAKE_REGEX.test(value);
}

function cleanLocalizedText(value?: string) {
  const trimmed = value?.trim();
  return trimmed && !isCorruptedLocalizedText(trimmed) ? trimmed : undefined;
}

export function normalizeLanguage(language?: string): SupportedLanguage {
  return language === "ar" ? "ar" : "en";
}

export function makeLocalizedString(
  legacyValue: string | undefined,
  localized?: LocalizedString
): LocalizedString {
  const fallback =
    cleanLocalizedText(legacyValue) ||
    cleanLocalizedText(localized?.en) ||
    cleanLocalizedText(localized?.ar) ||
    "";
  const en = cleanLocalizedText(localized?.en) || fallback;
  const ar = cleanLocalizedText(localized?.ar) || en || fallback;
  return { en, ar };
}

export function selectLocalizedString(
  legacyValue: string | undefined,
  localized: LocalizedString | undefined,
  language?: string
) {
  const normalizedLanguage = normalizeLanguage(language);
  const fallback =
    cleanLocalizedText(legacyValue) ||
    cleanLocalizedText(localized?.en) ||
    cleanLocalizedText(localized?.ar) ||
    "";
  if (normalizedLanguage === "ar") {
    return (
      cleanLocalizedText(localized?.ar) ||
      cleanLocalizedText(localized?.en) ||
      fallback
    );
  }
  return (
    cleanLocalizedText(localized?.en) ||
    cleanLocalizedText(localized?.ar) ||
    fallback
  );
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
