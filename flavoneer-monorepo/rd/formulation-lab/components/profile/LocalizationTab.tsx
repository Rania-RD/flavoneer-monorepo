import type React from "react";
import { useTranslation } from "react-i18next";
import type { Language } from "../../context/SettingsContext";

interface LocalizationTabProps {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
}

const LocalizationTab: React.FC<LocalizationTabProps> = ({
  currentLanguage,
  setLanguage,
}) => {
  const { t } = useTranslation();
  return (
    <div className="fade-in slide-in-from-end-4 animate-in space-y-6 duration-300">
      <div>
        <label className="mb-2 block font-bold text-gray-500 text-xs uppercase dark:text-slate-400">
          {t("interface_language")}
        </label>
        <select
          className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
          value={currentLanguage}
        >
          <option value="en">{t("english_us")}</option>
          <option value="ar">{t("arabic")}</option>
        </select>
      </div>

      <div className="border-gray-100 border-t pt-4 dark:border-slate-700">
        <h4 className="mb-2 font-bold text-gray-900 dark:text-white">
          {t("regional_formats")}
        </h4>
        <p className="mb-4 text-gray-500 text-sm dark:text-slate-400">
          {t("regional_formats_auto")}
        </p>
      </div>
    </div>
  );
};

export default LocalizationTab;
