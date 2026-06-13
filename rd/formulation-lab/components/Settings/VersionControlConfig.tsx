import { useMutation, useQuery } from "convex/react";
import { Check, GitBranch, Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { usePermissions } from "../../hooks/usePermissions";
import { Switch } from "../ui/Switch";

const VersionControlConfig: React.FC = () => {
  const { t } = useTranslation();
  const config = useQuery(api.systemConfig.getVersionControlConfig);
  const updateConfig = useMutation(api.systemConfig.updateVersionControlConfig);
  const { hasPermission, role } = usePermissions();

  const [tempPrefix, setTempPrefix] = useState("V");
  const [tempStyle, setTempStyle] = useState("major-minor");
  const [tempAutoIncrement, setTempAutoIncrement] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Ensure only admins can see the save button, although prompt asked to restrict update action to admin
  const isAdmin = role?.key === "admin" || hasPermission("manage_roles");

  useEffect(() => {
    if (config) {
      setTempPrefix(config.versionPrefix || "V");
      setTempStyle(config.versionStyle || "major-minor");
      setTempAutoIncrement(config.autoIncrementVersion ?? false);
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await updateConfig({
        versionPrefix: tempPrefix,
        versionStyle: tempStyle,
        autoIncrementVersion: tempAutoIncrement,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to update config:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (config) {
      setTempPrefix(config.versionPrefix || "V");
      setTempStyle(config.versionStyle || "major-minor");
      setTempAutoIncrement(config.autoIncrementVersion ?? false);
    }
  };

  if (config === undefined) {
    return (
      <div className="mt-6 flex items-center justify-center rounded-[2.5rem] bg-white p-6 dark:bg-[#1e293b]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const previewId = `${tempPrefix}${tempStyle === "single" ? "1" : "1.1"}`;
  const hasChanges =
    config &&
    (tempPrefix !== (config.versionPrefix || "V") ||
      tempStyle !== (config.versionStyle || "major-minor") ||
      tempAutoIncrement !== config.autoIncrementVersion);

  return (
    <section className="mt-8 overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1e293b]">
      <div className="border-gray-100 border-b p-8 dark:border-slate-800">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2 dark:bg-indigo-900/30">
            <GitBranch className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="font-bold text-gray-900 text-xl dark:text-white">
            {t("version_control")}
          </h3>
        </div>
        <p className="text-gray-500 text-sm dark:text-gray-400">
          {t("configure_how_project_versions_are_autom")}
        </p>
      </div>

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="font-semibold text-gray-700 text-sm dark:text-gray-300">
              {t("version_prefix")}
            </label>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-gray-900 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
              onChange={(e) => setTempPrefix(e.target.value)}
              placeholder={t("example_prefix")}
              type="text"
              value={tempPrefix}
            />
          </div>
          <div className="space-y-2">
            <label className="font-semibold text-gray-700 text-sm dark:text-gray-300">
              {t("versioning_style")}
            </label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
              onChange={(e) => setTempStyle(e.target.value)}
              value={tempStyle}
            >
              <option value="major-minor">{t("major_minor_1_0")}</option>
              <option value="single">{t("single_number_1")}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Switch
            checked={tempAutoIncrement}
            onChange={(checked) => setTempAutoIncrement(checked)}
          />
          <span className="font-medium text-gray-700 text-sm dark:text-gray-300">
            {t("auto_increment_version_on_every_procedur")}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-800/50 dark:bg-indigo-900/20">
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-700 text-xs uppercase tracking-wider dark:text-indigo-400">
              {t("preview_layout")}
            </span>
            <span className="font-bold font-mono text-base text-indigo-900 dark:text-indigo-300">
              {t("next_version_example")} {previewId}
            </span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center justify-end gap-4 border-gray-100 border-t pt-4 dark:border-slate-800">
            {saved && (
              <span className="fade-in slide-in-from-end-4 flex animate-in items-center font-medium text-indigo-600 text-sm dark:text-indigo-400">
                <Check className="me-1 h-4 w-4" /> {t("configuration_saved")}
              </span>
            )}
            {hasChanges && !isSaving && !saved && (
              <button
                className="font-semibold text-indigo-600 text-sm underline underline-offset-2 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                onClick={handleDiscard}
              >
                {t("discard")}
              </button>
            )}
            <button
              className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-sm text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                saved
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-indigo-600 hover:bg-indigo-500" // Using indigo to match the section theme visually
              }`}
              disabled={isSaving || !(hasChanges || saved)}
              onClick={handleSave}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <GitBranch className="h-4 w-4" />
              )}
              {isSaving
                ? t("saving")
                : saved
                  ? t("saved_exclamation")
                  : t("save_versioning_logic")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default VersionControlConfig;
