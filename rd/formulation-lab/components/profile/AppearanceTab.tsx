import { Check, type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../context/SettingsContext";
import {
  THEME_PREFERENCES,
  type ThemePreference,
} from "../../lib/theme-preference";

const optionIcons: Record<ThemePreference, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const optionLabels: Record<ThemePreference, string> = {
  light: "light_mode",
  dark: "dark_theme",
  system: "system_mode",
};

export default function AppearanceTab() {
  const { t } = useTranslation();
  const { setThemePreference, themePreference } = useSettings();

  return (
    <div>
      <h3 className="font-bold text-gray-900 text-lg dark:text-white">
        {t("appearance")}
      </h3>
      <p className="mt-1 text-gray-500 text-sm dark:text-slate-400">
        {t("appearance_preference_description")}
      </p>

      <fieldset className="mt-6 grid gap-3">
        <legend className="sr-only">{t("appearance")}</legend>
        {THEME_PREFERENCES.map((preference) => {
          const Icon = optionIcons[preference];
          const selected = preference === themePreference;
          return (
            <button
              aria-pressed={selected}
              className={`flex min-h-16 items-center gap-4 rounded-2xl border px-4 text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus/60 ${
                selected
                  ? "border-brand-primary bg-brand-mint/70 text-brand-primary shadow-sm dark:border-brand-accent dark:bg-brand-accent/15 dark:text-brand-accent-hover"
                  : "border-gray-200 bg-white text-gray-700 hover:border-brand-primary/30 hover:bg-brand-mint/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-accent/30 dark:hover:bg-slate-800/70"
              }`}
              key={preference}
              onClick={() => setThemePreference(preference)}
              type="button"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  selected
                    ? "bg-white/80 dark:bg-brand-accent/15"
                    : "bg-gray-100 dark:bg-slate-700"
                }`}
              >
                <Icon aria-hidden="true" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-sm">
                  {t(optionLabels[preference])}
                </span>
                {preference === "system" ? (
                  <span className="mt-0.5 block text-gray-500 text-xs dark:text-slate-400">
                    {t("system_mode_description")}
                  </span>
                ) : null}
              </span>
              {selected ? <Check aria-hidden="true" size={19} /> : null}
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}
