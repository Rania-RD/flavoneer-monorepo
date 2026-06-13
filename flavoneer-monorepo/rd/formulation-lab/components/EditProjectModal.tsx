import { AnimatePresence } from "framer-motion";
import { Activity, Hash, Save, Target, Thermometer, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";
import type { EnrichedProject } from "../types";
import { GsfaCategorySelect } from "./GsfaCategorySelect";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProject: EnrichedProject) => void;
  project: EnrichedProject;
  teamMembers?: { userId: string; userName: string; userAvatarUrl?: string }[];
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
  teamMembers = [],
}) => {
  const { isRTL } = useSettings();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<EnrichedProject>(project);

  // Sync with project prop when it changes or modal opens
  useEffect(() => {
    setFormData(project);
  }, [project, isOpen]);

  const handleInputChange = (
    field: keyof EnrichedProject,
    value: EnrichedProject[keyof EnrichedProject]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  // Styles for Dark Mode Input Fields (Slate 700 bg, Slate 100 text, Slate 600 border)
  const inputClass =
    "w-full px-4 py-3 bg-gray-50 dark:bg-[#334155] border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const labelClass =
    "block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2";
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
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm dark:bg-[#0f172a]/80"
            exit="exit"
            initial="hidden"
            onClick={onClose}
            variants={overlayVariants}
          />

          {/* Modal Container */}
          <MotionDiv
            animate="visible"
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2.5rem] border border-white/50 bg-[#FDFCF6] shadow-2xl dark:border-slate-700 dark:bg-[#0f172a]"
            exit="exit"
            initial="hidden"
            variants={modalVariants}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-gray-100 border-b bg-[#FDFCF6]/80 px-8 py-6 backdrop-blur-md dark:border-slate-700 dark:bg-[#0f172a]/80">
              <div>
                <h2 className="font-bold text-2xl text-gray-900 dark:text-slate-100">
                  {t("editProject")}
                </h2>
                <p className="text-gray-500 text-sm dark:text-slate-400">
                  {t("update_formulation_parameters_and_target")}
                </p>
              </div>
              <button
                className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-[#1e293b] dark:text-slate-400 dark:hover:bg-slate-600"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            <form className="space-y-6 p-8" onSubmit={handleSubmit}>
              {/* Bento Grid Layout */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Tile 1: Basic Info (Span 2) */}
                <div className="col-span-1 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm md:col-span-2 dark:border-slate-700 dark:bg-[#1e293b]">
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900 text-lg dark:text-slate-100">
                    {t("project_identity")}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("project_name")}</label>
                      <input
                        className={inputClass}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        value={formData.name}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t("version")}</label>
                      <input
                        className={inputClass}
                        onChange={(e) =>
                          handleInputChange("version", e.target.value)
                        }
                        value={formData.version}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>
                        {t("authorized_executor")}
                      </label>
                      <select
                        className={inputClass}
                        onChange={(e) =>
                          handleInputChange(
                            "authorizedExecutor",
                            e.target.value
                          )
                        }
                        value={formData.authorizedExecutor || ""}
                      >
                        <option value="">{t("anyone_no_restrictions")}</option>
                        {teamMembers.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.userName}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-gray-500 text-xs">
                        {t("only_the_selected_user_will_be_able_to_e")}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>{t("description")}</label>
                      <textarea
                        className={`${inputClass} resize-none`}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        rows={2}
                        value={formData.description}
                      />
                    </div>
                  </div>
                </div>

                {/* Tile 2: Processing Parameters */}
                <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-6 shadow-sm dark:border-sky-800/30 dark:bg-sky-900/10">
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-lg text-sky-900 dark:text-sky-100">
                    <Thermometer className="text-sky-500" size={18} />{" "}
                    {t("processing")}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block font-bold text-sky-700 text-xs uppercase tracking-wider dark:text-sky-300">
                        {t("method")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
                        onChange={(e) =>
                          handleInputChange("processingMethod", e.target.value)
                        }
                        value={formData.processingMethod || ""}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-2 block font-bold text-sky-700 text-xs uppercase tracking-wider dark:text-sky-300">
                          {t("temp_c")}
                        </label>
                        <input
                          className="w-full rounded-xl border border-sky-200 bg-white px-3 py-3 text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
                          onChange={(e) =>
                            handleInputChange(
                              "processingTemp",
                              Number.parseFloat(e.target.value)
                            )
                          }
                          type="number"
                          value={formData.processingTemp || ""}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block font-bold text-sky-700 text-xs uppercase tracking-wider dark:text-sky-300">
                          {t("time")}
                        </label>
                        <input
                          className="w-full rounded-xl border border-sky-200 bg-white px-3 py-3 text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
                          onChange={(e) =>
                            handleInputChange("processingTime", e.target.value)
                          }
                          value={formData.processingTime || ""}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tile 3: Nutrition & Targets */}
                <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6 shadow-sm dark:border-amber-800/30 dark:bg-amber-900/10">
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-amber-900 text-lg dark:text-amber-100">
                    <Activity className="text-amber-500" size={18} />{" "}
                    {t("nutrition_goals")}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block font-bold text-amber-700 text-xs uppercase tracking-wider dark:text-amber-300">
                        {t("nutritional_goal")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
                        onChange={(e) =>
                          handleInputChange("nutritionalGoal", e.target.value)
                        }
                        value={formData.nutritionalGoal || ""}
                      />
                    </div>
                    <div>
                      <GsfaCategorySelect
                        inputClassName="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
                        labelClassName="mb-2 block font-bold text-amber-700 text-xs uppercase tracking-wider dark:text-amber-300"
                        onChange={(category) => {
                          handleInputChange(
                            "gsfaCategoryCode",
                            category.code
                          );
                          handleInputChange(
                            "gsfaCategoryName",
                            category.name
                          );
                        }}
                        value={{
                          code: formData.gsfaCategoryCode,
                          name: formData.gsfaCategoryName,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tile 4: Batch ID Configuration */}
                <div className="rounded-[2rem] border border-teal-100 bg-teal-50 p-6 shadow-sm dark:border-teal-800/30 dark:bg-teal-900/10">
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-lg text-teal-900 dark:text-teal-100">
                    <Hash className="text-teal-500" size={18} /> {t("batchId")}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block font-bold text-teal-700 text-xs uppercase tracking-wider dark:text-teal-300">
                        {t("prefix")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-teal-200 bg-white px-4 py-3 font-mono text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-100"
                        maxLength={6}
                        onChange={(e) =>
                          handleInputChange(
                            "batchCodePrefix",
                            e.target.value.toUpperCase().slice(0, 6)
                          )
                        }
                        placeholder={formData.name
                          .split(" ")[0]
                          .toUpperCase()
                          .slice(0, 4)}
                        value={formData.batchCodePrefix || ""}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block font-bold text-teal-700 text-xs uppercase tracking-wider dark:text-teal-300">
                        {t("format")}
                      </label>
                      <select
                        className="w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-100"
                        onChange={(e) =>
                          handleInputChange("batchCodeFormat", e.target.value)
                        }
                        value={formData.batchCodeFormat || "prefix-seq"}
                      >
                        <option value="prefix-seq">
                          {t("sequential_prefix_001")}
                        </option>
                        <option value="prefix-date-seq">
                          {t("date_seq_prefix_250212_001")}
                        </option>
                        <option value="prefix-random">
                          {t("random_prefix_892a")}
                        </option>
                      </select>
                    </div>
                    {/* Live Preview */}
                    <div className="rounded-lg bg-teal-100/50 px-4 py-3 dark:bg-teal-900/20">
                      <p className="mb-1 font-bold text-[10px] text-teal-600 uppercase tracking-wider dark:text-teal-400">
                        {t("preview")}
                      </p>
                      <p className="font-bold font-mono text-sm text-teal-800 dark:text-teal-200">
                        {(() => {
                          const pfx =
                            formData.batchCodePrefix ||
                            formData.name
                              .split(" ")[0]
                              .toUpperCase()
                              .slice(0, 4);
                          const fmt = formData.batchCodeFormat || "prefix-seq";
                          switch (fmt) {
                            case "prefix-date-seq": {
                              const now = new Date();
                              const yy = String(now.getFullYear()).slice(-2);
                              const mm = String(now.getMonth() + 1).padStart(
                                2,
                                "0"
                              );
                              const dd = String(now.getDate()).padStart(2, "0");
                              return `${pfx}-${yy}${mm}${dd}-001`;
                            }
                            case "prefix-random":
                              return `${pfx}-892A`;
                            default:
                              return `${pfx}-001`;
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tile 5: Target Outcome (Span 2) */}
                <div className="rounded-[2rem] border border-purple-100 bg-purple-50 p-6 shadow-sm md:col-span-2 dark:border-purple-800/30 dark:bg-purple-900/10">
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-lg text-purple-900 dark:text-purple-100">
                    <Target className="text-purple-500" size={18} />{" "}
                    {t("outcome_targets")}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block font-bold text-purple-700 text-xs uppercase tracking-wider dark:text-purple-300">
                        {t("target_outcome_description")}
                      </label>
                      <textarea
                        className="w-full resize-none rounded-xl border border-purple-200 bg-white px-4 py-3 text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-100"
                        onChange={(e) =>
                          handleInputChange("targetOutcome", e.target.value)
                        }
                        rows={3}
                        value={formData.targetOutcome || ""}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block font-bold text-purple-700 text-xs uppercase tracking-wider dark:text-purple-300">
                        {t("target_texture")}
                      </label>
                      <input
                        className="mb-3 w-full rounded-xl border border-purple-200 bg-white px-4 py-3 text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-100"
                        onChange={(e) =>
                          handleInputChange("targetTexture", e.target.value)
                        }
                        value={formData.targetTexture || ""}
                      />
                      <p className="text-purple-600 text-xs opacity-70 dark:text-purple-300">
                        {t("specific_viscosity_or_organoleptic_prope")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 border-gray-100 border-t pt-4 dark:border-slate-700">
                <button
                  className="rounded-xl px-6 py-3 font-bold text-gray-500 transition-colors hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
                  onClick={onClose}
                  type="button"
                >
                  {t("cancel")}
                </button>
                <button
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-bold text-white shadow-blue-500/30 shadow-lg transition-all hover:bg-blue-700"
                  type="submit"
                >
                  <Save size={18} />
                  {t("saveChanges")}
                </button>
              </div>
            </form>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditProjectModal;
