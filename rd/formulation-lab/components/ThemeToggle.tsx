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
              ? "bg-[#f5a623]/15 text-[#f5a623]"
              : "bg-[#d2f2d4] text-[#1c4a3c]"
          }`}
        >
          {darkMode ? <Moon size={20} /> : <Sun size={20} />}
        </div>
        <div>
          <span className="block font-bold text-[#173e33] text-sm dark:text-[#f7f4df]">
            {t("dark_mode")}
          </span>
          <span className="block text-[#658579] text-xs dark:text-[#9abcae]">
            {darkMode ? t("switch_to_light_mode") : t("switch_to_dark_mode")}
          </span>
        </div>
      </div>

      <Switch checked={darkMode} onChange={toggleDarkMode} size="lg" />
    </div>
  );
};

export default ThemeToggle;
