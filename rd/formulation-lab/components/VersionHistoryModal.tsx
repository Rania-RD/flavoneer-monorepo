import { useMutation, useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { History, Plus, RotateCcw, Save, X } from "lucide-react";
import { DateTime } from "luxon";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useToast } from "../hooks/useToast";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";

interface VersionHistoryModalProps {
  currentVersion: string;
  isOpen: boolean;
  onClose: () => void;
  projectId: Id<"projects">;
}

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  projectId,
  currentVersion,
}) => {
  const { isRTL } = useSettings();
  const { t } = useTranslation();
  const versions = useQuery(api.projectVersions.list, { projectId });
  const { toast } = useToast();
  const nextVersionSuggestion = useQuery(api.projectVersions.getNextVersion, {
    projectId,
  });

  const createVersion = useMutation(api.projectVersions.create);
  const restoreVersion = useMutation(api.projectVersions.restore);

  // New Version Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newVersionNum, setNewVersionNum] = useState("");
  const [newVersionName, setNewVersionName] = useState("");

  // Auto-fill version number when suggestion loads or modal opens
  React.useEffect(() => {
    if (nextVersionSuggestion && isCreating) {
      setNewVersionNum(nextVersionSuggestion);
    }
  }, [nextVersionSuggestion, isCreating]);

  const handleCreateVersion = async () => {
    if (!newVersionNum) {
      toast.error(t("version_number_required"));
      return;
    }

    try {
      await createVersion({
        projectId,
        version: newVersionNum,
        name: newVersionName || undefined,
      });
      toast.success(t("version_created_successfully"));
      setIsCreating(false);
      setNewVersionNum("");
      setNewVersionName("");
    } catch (error) {
      console.error(error);
      toast.error(t("failed_to_create_version"));
    }
  };

  const handleRestore = async (
    versionId: Id<"projectVersions">,
    versionNum: string
  ) => {
    if (
      !confirm(
        t("restore_version_confirmation", { version: versionNum })
      )
    ) {
      return;
    }

    try {
      await restoreVersion({ projectId, versionId });
      toast.success(t("restored_version", { version: versionNum }));
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(t("failed_to_restore_version"));
    }
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Backdrop */}
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm dark:bg-black/60"
            exit="exit"
            initial="hidden"
            onClick={onClose}
            variants={overlayVariants}
          />

          {/* Modal Content */}
          <MotionDiv
            animate="visible"
            className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-white/50 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#1e293b]"
            exit="exit"
            initial="hidden"
            variants={modalVariants}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-gray-100 border-b p-8 pb-4 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                  <History size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-xl dark:text-slate-100">
                    {t("version_history")}
                  </h2>
                  <p className="text-gray-500 text-sm dark:text-slate-400">
                    {t("current_version")}{" "}
                    <span className="font-bold font-mono">
                      {currentVersion}
                    </span>
                  </p>
                </div>
              </div>
              <button
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto p-8 pt-4">
              {/* Create Version Section */}
              {isCreating ? (
                <div className="mb-8 rounded-[2rem] border border-purple-100 bg-gray-50 p-6 dark:border-purple-500/20 dark:bg-slate-800/50">
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-purple-900 text-sm dark:text-purple-100">
                    <Plus size={16} /> {t("new_version_snapshot")}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block font-bold text-gray-500 text-xs uppercase tracking-wider dark:text-slate-400">
                        {t("version_number")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900"
                        onChange={(e) => setNewVersionNum(e.target.value)}
                        placeholder={t("example_version")}
                        type="text"
                        value={newVersionNum}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-gray-500 text-xs uppercase tracking-wider dark:text-slate-400">
                        {t("label_optional")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900"
                        onChange={(e) => setNewVersionName(e.target.value)}
                        placeholder={t("example_version_notes")}
                        type="text"
                        value={newVersionName}
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        className="px-4 py-2 font-bold text-gray-500 text-sm hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                        onClick={() => setIsCreating(false)}
                      >
                        {t("cancel")}
                      </button>
                      <button
                        className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2 font-bold text-sm text-white shadow-lg shadow-purple-600/20 transition-all hover:bg-purple-700"
                        onClick={handleCreateVersion}
                      >
                        <Save size={16} /> {t("save_version")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  className="mb-6 flex w-full items-center justify-center gap-2 rounded-[2rem] border-2 border-gray-200 border-dashed py-4 font-bold text-gray-400 transition-all hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600 dark:border-slate-700 dark:text-slate-500 dark:hover:border-purple-500/30 dark:hover:bg-purple-500/10 dark:hover:text-purple-400"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus size={20} /> {t("create_new_version_snapshot")}
                </button>
              )}

              {/* List */}
              <div className="space-y-4">
                {versions === undefined ? (
                  <p className="text-center text-gray-400">
                    {t("loading_history")}
                  </p>
                ) : versions.length === 0 ? (
                  <p className="py-4 text-center text-gray-400">
                    {t("no_version_history_found")}
                  </p>
                ) : (
                  versions.map((v) => (
                    <div
                      className="group flex flex-col justify-between gap-4 rounded-[2rem] border border-gray-100 bg-white p-5 transition-all hover:shadow-md sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-800"
                      key={v._id}
                    >
                      <div>
                        <div className="mb-1 flex items-center gap-3">
                          <span className="rounded-lg bg-gray-100 px-3 py-1 font-bold font-mono text-gray-700 text-xs dark:bg-slate-700 dark:text-slate-300">
                            v{v.version}
                          </span>
                          <span className="text-gray-400 text-xs dark:text-slate-500">
                            {DateTime.fromMillis(v.createdAt).toLocaleString(
                              DateTime.DATE_SHORT
                            )}
                          </span>
                        </div>
                        {v.name && (
                          <p className="font-bold text-gray-900 text-sm dark:text-slate-100">
                            {v.name}
                          </p>
                        )}
                      </div>

                      <button
                        className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-500 text-xs opacity-0 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-900/30 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        onClick={() => handleRestore(v._id, v.version)}
                      >
                        <RotateCcw size={14} /> {t("restore")}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
};

export default VersionHistoryModal;
