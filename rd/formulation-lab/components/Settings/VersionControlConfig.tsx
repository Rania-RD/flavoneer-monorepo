import { api } from "@flavoneer/backend/api";
import { useMutation, useQuery } from "convex/react";
import { Check, GitBranch, Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOrganization } from "../../context/OrganizationContext";
import { usePermissions } from "../../hooks/usePermissions";
import { MANAGE_VERSION_CONTROL_PERMISSION } from "../../lib/organization-settings-access";
import { Switch } from "../ui/Switch";

const VersionControlConfig: React.FC = () => {
  const { t } = useTranslation();
  const { activeOrganizationId } = useOrganization();
  const config = useQuery(
    api.systemConfig.getVersionControlConfig,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip",
  );
  const updateConfig = useMutation(api.systemConfig.updateVersionControlConfig);
  const { hasPermission } = usePermissions();

  const [tempPrefix, setTempPrefix] = useState("V");
  const [tempStyle, setTempStyle] = useState("major-minor");
  const [tempAutoIncrement, setTempAutoIncrement] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canManageVersionControl = hasPermission(
    MANAGE_VERSION_CONTROL_PERMISSION,
  );

  useEffect(() => {
    if (config) {
      setTempPrefix(config.versionPrefix || "V");
      setTempStyle(config.versionStyle || "major-minor");
      setTempAutoIncrement(config.autoIncrementVersion ?? false);
    }
  }, [config]);

  const handleSave = async () => {
    if (!activeOrganizationId) {
      return;
    }
    setIsSaving(true);
    setSaved(false);
    try {
      await updateConfig({
        organizationId: activeOrganizationId,
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
          <div className="rounded-xl bg-brand-mint p-2 dark:bg-brand-accent/30">
            <GitBranch className="h-6 w-6 text-brand-primary dark:text-brand-accent-hover" />
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
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-gray-900 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-brand-focus/50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
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
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-brand-focus/50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
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

        <div className="flex items-center justify-between rounded-xl border border-brand-primary/20 bg-brand-mint p-4 dark:border-brand-mint/20 dark:bg-brand-accent/20">
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-primary text-xs uppercase tracking-wider dark:text-brand-accent-hover">
              {t("preview_layout")}
            </span>
            <span className="font-bold font-mono text-base text-brand-primary dark:text-brand-accent-hover">
              {t("next_version_example")} {previewId}
            </span>
          </div>
        </div>

        {canManageVersionControl && (
          <div className="flex items-center justify-end gap-4 border-gray-100 border-t pt-4 dark:border-slate-800">
            {saved && (
              <span className="fade-in slide-in-from-end-4 flex animate-in items-center font-medium text-brand-primary text-sm dark:text-brand-accent-hover">
                <Check className="me-1 h-4 w-4" /> {t("configuration_saved")}
              </span>
            )}
            {hasChanges && !isSaving && !saved && (
              <button
                className="font-semibold text-brand-primary text-sm underline underline-offset-2 transition-colors hover:text-brand-primary dark:text-brand-accent-hover dark:hover:text-brand-cream"
                onClick={handleDiscard}
              >
                {t("discard")}
              </button>
            )}
            <button
              className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-sm text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                saved
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-brand-primary hover:bg-brand-primary-hover" // Brand primary action
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
