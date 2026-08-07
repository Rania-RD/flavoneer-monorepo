export const THEME_PREFERENCES = ["dark", "light", "system"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === "string" &&
  THEME_PREFERENCES.includes(value as ThemePreference);

export const normalizeThemePreference = (
  value: unknown,
  legacyDarkMode?: boolean
): ThemePreference => {
  if (isThemePreference(value)) {
    return value;
  }
  if (legacyDarkMode !== undefined) {
    return legacyDarkMode ? "dark" : "light";
  }
  return "system";
};

export const resolveDarkMode = (
  preference: ThemePreference,
  systemPrefersDark: boolean
) => (preference === "system" ? systemPrefersDark : preference === "dark");
