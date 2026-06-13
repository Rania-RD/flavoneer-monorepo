import { useMutation, useQuery } from "convex/react";
import { Check, Hash, Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { usePermissions } from "../../hooks/usePermissions";

const TraceabilityConfig: React.FC = () => {
  const { t } = useTranslation();
  const config = useQuery(api.systemConfig.getTraceabilityConfig);
  const updateConfig = useMutation(api.systemConfig.updateTraceabilityConfig);
  const { hasPermission, role } = usePermissions();

  const [draftPrefix, setDraftPrefix] = useState("FD-");
  const [draftStartNum, setDraftStartNum] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Ensure only admins can see the save button, although prompt asked to restrict update action to admin
  const isAdmin = role?.key === "admin" || hasPermission("manage_roles");

  useEffect(() => {
    if (config) {
      setDraftPrefix(config.idPrefix ?? "FD-");
      setDraftStartNum(config.currentIdNumber ?? 1);
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await updateConfig({
        idPrefix: draftPrefix,
        currentIdNumber: draftStartNum,
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
      setDraftPrefix(config.idPrefix ?? "FD-");
      setDraftStartNum(config.currentIdNumber ?? 1);
    }
  };

  if (config === undefined) {
    return (
      <div className="mt-6 flex items-center justify-center rounded-[2.5rem] bg-white p-6 dark:bg-[#1e293b]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const previewId = `${draftPrefix}${String(draftStartNum).padStart(3, "0")}`;
  const hasChanges =
    config &&
    (draftPrefix !== config.idPrefix ||
      draftStartNum !== config.currentIdNumber);

  return (
    <section className="mt-8 overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1e293b]">
      <div className="border-gray-100 border-b p-8 dark:border-slate-800">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-xl bg-teal-50 p-2 dark:bg-teal-900/30">
            <Hash className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <h3 className="font-bold text-gray-900 text-xl dark:text-white">
            {t("traceability_id_configuration")}
          </h3>
        </div>
        <p className="text-gray-500 text-sm dark:text-gray-400">
          {t("configure_the_global_id_generation_mask_")}
        </p>
      </div>

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="font-semibold text-gray-700 text-sm dark:text-gray-300">
              {t("prefix_input")}
            </label>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-gray-900 text-sm uppercase transition-all focus:border-transparent focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
              onChange={(e) => setDraftPrefix(e.target.value.toUpperCase())}
              placeholder={t("example_traceability")}
              type="text"
              value={draftPrefix}
            />
          </div>
          <div className="space-y-2">
            <label className="font-semibold text-gray-700 text-sm dark:text-gray-300">
              {t("starting_number")}
            </label>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-gray-900 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
              min="1"
              onChange={(e) =>
                setDraftStartNum(Number.parseInt(e.target.value) || 1)
              }
              type="number"
              value={draftStartNum}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 p-4 dark:border-teal-800/50 dark:bg-teal-900/20">
          <div className="flex items-center gap-2">
            <span className="font-bold text-teal-700 text-xs uppercase tracking-wider dark:text-teal-400">
              {t("preview_layout")}
            </span>
            <span className="font-bold font-mono text-base text-teal-900 dark:text-teal-300">
              {t("next_id")} {previewId}
            </span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center justify-end gap-4 border-gray-100 border-t pt-4 dark:border-slate-800">
            {saved && (
              <span className="fade-in slide-in-from-end-4 flex animate-in items-center font-medium text-sm text-teal-600 dark:text-teal-400">
                <Check className="me-1 h-4 w-4" />{" "}
                {t("configuration_finalized")}
              </span>
            )}
            {hasChanges && !isSaving && !saved && (
              <button
                className="px-6 py-3 font-semibold text-gray-600 text-sm transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                onClick={handleDiscard}
              >
                {t("discard_changes")}
              </button>
            )}
            <button
              className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-sm text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                saved
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-teal-600 hover:bg-teal-500" // Using teal to match the section theme visually
              }`}
              disabled={isSaving || !(hasChanges || saved)}
              onClick={handleSave}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Hash className="h-4 w-4" />
              )}
              {isSaving
                ? t("saving")
                : saved
                  ? t("saved_exclamation")
                  : t("save_tracking_logic")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default TraceabilityConfig;
