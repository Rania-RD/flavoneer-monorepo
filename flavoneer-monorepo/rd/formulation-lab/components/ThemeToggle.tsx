import { Moon, Sun } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { Switch } from "./ui/Switch";

const ThemeToggle: React.FC = () => {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode } = useSettings();

  return (
    <div className="group flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`rounded-full p-2 transition-colors ${
            darkMode
              ? "bg-indigo-500/20 text-indigo-300"
              : "bg-orange-100 text-orange-500"
          }`}
        >
          {darkMode ? <Moon size={20} /> : <Sun size={20} />}
        </div>
        <div>
          <span className="block font-medium text-gray-900 text-sm dark:text-gray-100">
            {t("dark_mode")}
          </span>
          <span className="block text-gray-500 text-xs dark:text-gray-400">
            {darkMode ? t("switch_to_light_mode") : t("switch_to_dark_mode")}
          </span>
        </div>
      </div>

      <Switch checked={darkMode} onChange={toggleDarkMode} size="lg" />
    </div>
  );
};

export default ThemeToggle;
