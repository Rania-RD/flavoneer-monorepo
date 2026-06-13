import { useMutation } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { FlaskConical, Plus, Save, Trash2, X } from "lucide-react";
import { DateTime } from "luxon";
import type React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";

interface Run {
  _id: Id<"runs">;
  batchCode: string;
  projectId: Id<"projects">;
  projectName: string;
}

interface NewLabReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  runs: Run[];
}

const SAMPLE_TYPES = [
  { key: "sample_finished_product", value: "Finished Product" },
  { key: "sample_prototype", value: "Prototype" },
  { key: "sample_raw_material", value: "Raw Material" },
  { key: "sample_in_process", value: "In-Process" },
];

const NewLabReportModal: React.FC<NewLabReportModalProps> = ({
  isOpen,
  onClose,
  runs,
}) => {
  const { t } = useTranslation();
  const { isRTL, profile } = useSettings();
  const createLabReport = useMutation(api.labReports.create);

  const [saving, setSaving] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState("");

  const [sampleType, setSampleType] = useState(SAMPLE_TYPES[0].value);
  const [version, setVersion] = useState("");
  const [results, setResults] = useState([
    {
      parameter: "",
      method: "",
      targetRange: "",
      min: 0,
      max: 0,
      actualValue: 0,
      unit: "",
    },
  ]);

  const selectedRun = runs.find((r) => r._id === selectedRunId);

  const handleAddResult = () => {
    setResults((prev) => [
      ...prev,
      {
        parameter: "",
        method: "",
        targetRange: "",
        min: 0,
        max: 0,
        actualValue: 0,
        unit: "",
      },
    ]);
  };

  const handleRemoveResult = (index: number) => {
    setResults((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResultChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const resetForm = () => {
    setSelectedRunId("");
    setSampleType(SAMPLE_TYPES[0].value);
    setVersion("");
    setResults([
      {
        parameter: "",
        method: "",
        targetRange: "",
        min: 0,
        max: 0,
        actualValue: 0,
        unit: "",
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRun) {
      return;
    }

    const validResults = results.filter((r) => r.parameter.trim());
    if (validResults.length === 0) {
      return;
    }

    setSaving(true);
    try {
      const reportId = `LR-${DateTime.now().year}-${Math.floor(Math.random() * 900 + 100)}`;
      await createLabReport({
        reportId,
        runId: selectedRun._id,
        projectId: selectedRun.projectId,
        version: version || "1.0",
        lotNumber: selectedRun.batchCode,
        date: DateTime.now().toLocaleString(DateTime.DATE_MED),
        status: "Pending",
        leadChemist: profile.name || t("unknown"),
        sampleType,
        hash:
          Math.random().toString(36).substring(2, 10) +
          "..." +
          Math.random().toString(36).substring(2, 6),
        results: validResults,
      });
      resetForm();
      onClose();
    } catch (err) {
      console.error("Failed to create lab report:", err);
    } finally {
      setSaving(false);
    }
  };

  const inputClasses =
    "w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";

  const labelClasses =
    "text-sm font-semibold text-gray-700 dark:text-slate-200";

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Backdrop */}
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm dark:bg-black/60"
            exit="exit"
            initial="hidden"
            onClick={onClose}
            variants={overlayVariants}
          />

          {/* Modal Card */}
          <MotionDiv
            animate="visible"
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-slate-800"
            exit="exit"
            initial="hidden"
            variants={modalVariants}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-gray-100 border-b bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div
                className={`flex items-center ${isRTL ? "space-x-3 space-x-reverse" : "space-x-3"}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <FlaskConical size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-xl dark:text-white">
                    {t("new_lab_report")}
                  </h2>
                  <p className="text-gray-500 text-xs dark:text-slate-400">
                    {t("link_a_qc_report_to_an_existing_run")}
                  </p>
                </div>
              </div>
              <button
                className="rounded-full bg-gray-50 p-2 text-gray-400 transition-colors hover:text-gray-600 dark:bg-slate-700 dark:hover:text-white"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <form
                className="space-y-6"
                id="lab-report-form"
                onSubmit={handleSubmit}
              >
                {/* Run Selection */}
                <div className="space-y-1.5">
                  <label className={labelClasses}>{t("run_batch")}</label>
                  <select
                    className={inputClasses}
                    onChange={(e) => setSelectedRunId(e.target.value)}
                    required
                    value={selectedRunId}
                  >
                    <option disabled value="">
                      {t("select_a_completed_run")}
                    </option>
                    {runs.map((run) => (
                      <option key={run._id} value={run._id}>
                        {run.batchCode} — {run.projectName}
                      </option>
                    ))}
                  </select>
                  {selectedRun && (
                    <p className="mt-1 font-medium text-indigo-600 text-xs dark:text-indigo-400">
                      {t("project")} {selectedRun.projectName} {t("batch")}{" "}
                      {selectedRun.batchCode}
                    </p>
                  )}
                </div>

                {/* Meta Fields */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className={labelClasses}>{t("sample_type")}</label>
                    <select
                      className={inputClasses}
                      onChange={(e) => setSampleType(e.target.value)}
                      value={sampleType}
                    >
                      {SAMPLE_TYPES.map((sampleTypeOption) => (
                        <option key={sampleTypeOption.value} value={sampleTypeOption.value}>
                          {t(sampleTypeOption.key)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClasses}>{t("version")}</label>
                    <input
                      className={`${inputClasses} font-mono`}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder={t("example_2")}
                      type="text"
                      value={version}
                    />
                  </div>
                </div>

                {/* Test Results */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className={labelClasses}>{t("test_results")}</label>
                    <button
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 font-bold text-indigo-600 text-xs transition-colors hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                      onClick={handleAddResult}
                      type="button"
                    >
                      <Plus size={14} /> {t("add_test")}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <div
                        className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900"
                        key={index}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-400 text-xs dark:text-slate-500">
                            {t("test")}
                            {index + 1}
                          </span>
                          {results.length > 1 && (
                            <button
                              className="p-1 text-red-400 transition-colors hover:text-red-600 dark:hover:text-red-300"
                              onClick={() => handleRemoveResult(index)}
                              type="button"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          <input
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                            onChange={(e) =>
                              handleResultChange(
                                index,
                                "parameter",
                                e.target.value
                              )
                            }
                            placeholder={t("parameter")}
                            type="text"
                            value={result.parameter}
                          />
                          <input
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                            onChange={(e) =>
                              handleResultChange(
                                index,
                                "method",
                                e.target.value
                              )
                            }
                            placeholder={t("method")}
                            type="text"
                            value={result.method}
                          />
                          <input
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                            onChange={(e) =>
                              handleResultChange(
                                index,
                                "targetRange",
                                e.target.value
                              )
                            }
                            placeholder={t("target_range")}
                            type="text"
                            value={result.targetRange}
                          />
                          <input
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                            onChange={(e) =>
                              handleResultChange(index, "unit", e.target.value)
                            }
                            placeholder={t("unit")}
                            type="text"
                            value={result.unit}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="mb-1 block text-gray-400 text-xs dark:text-slate-500">
                              {t("min")}
                            </label>
                            <input
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                              onChange={(e) =>
                                handleResultChange(
                                  index,
                                  "min",
                                  Number.parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder={t("placeholder_0_str")}
                              step="0.01"
                              type="number"
                              value={result.min || ""}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-gray-400 text-xs dark:text-slate-500">
                              {t("max")}
                            </label>
                            <input
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                              onChange={(e) =>
                                handleResultChange(
                                  index,
                                  "max",
                                  Number.parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder={t("placeholder_0_str")}
                              step="0.01"
                              type="number"
                              value={result.max || ""}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-gray-400 text-xs dark:text-slate-500">
                              {t("actual_value")}
                            </label>
                            <input
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                              onChange={(e) =>
                                handleResultChange(
                                  index,
                                  "actualValue",
                                  Number.parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder={t("placeholder_0_str")}
                              step="0.01"
                              type="number"
                              value={result.actualValue || ""}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-gray-200 border-t bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/80">
              <button
                className="px-4 py-2 font-medium text-gray-600 text-sm transition-colors hover:text-gray-900 dark:text-slate-300 dark:hover:text-white"
                onClick={onClose}
                type="button"
              >
                {t("cancel")}
              </button>
              <button
                className="flex items-center rounded-lg bg-indigo-600 px-6 py-2 font-medium text-sm text-white shadow-indigo-600/20 shadow-lg transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving || !selectedRunId}
                form="lab-report-form"
                type="submit"
              >
                <Save className={isRTL ? "ms-2" : "me-2"} size={16} />
                {saving ? t("saving") : t("create_report")}
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
};

export default NewLabReportModal;
