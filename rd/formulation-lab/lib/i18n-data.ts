export type SupportedLanguage = "en" | "ar";

export interface LocalizedString {
  ar?: string;
  en?: string;
}

export const I18N_DATA_VERSION = 201;

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
  const activeLanguage = normalizeLanguage(language);
  const fallback = legacyValue ?? localized?.en ?? localized?.ar ?? "";
  if (activeLanguage === "ar") {
    return localized?.ar || localized?.en || fallback;
  }
  return localized?.en || localized?.ar || fallback;
}

export function buildLocalizedInputValue(en: string, ar: string) {
  return makeLocalizedString(en, { en, ar });
}
