export type SupportedLanguage = "en" | "ar";

export interface LocalizedString {
  ar?: string;
  en?: string;
}

export const I18N_DATA_VERSION = 201;
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
  const activeLanguage = normalizeLanguage(language);
  const fallback =
    cleanLocalizedText(legacyValue) ||
    cleanLocalizedText(localized?.en) ||
    cleanLocalizedText(localized?.ar) ||
    "";
  if (activeLanguage === "ar") {
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

export function buildLocalizedInputValue(en: string, ar: string) {
  return makeLocalizedString(en, { en, ar });
}
