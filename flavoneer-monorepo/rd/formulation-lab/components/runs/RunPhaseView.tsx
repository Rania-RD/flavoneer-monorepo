import { useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Clock,
  Play,
  Scale,
  Settings,
  ShieldCheck,
  Table2,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { RunRecipePhase, RunRecipeStep } from "../../types";
import { MiniSpreadsheetEditor } from "../spreadsheet/MiniSpreadsheetEditor";
import TimerDisplay from "./TimerDisplay";

interface RunPhaseViewProps {
  activePhase: RunRecipePhase;
  activeStep?: RunRecipeStep;
  checklistState: Record<string, boolean>;
  conditionalAnswers?: Record<string, "pass" | "fail" | null>;
  onTimerComplete: () => void;
  qcValues: Record<string, number>;
  runValues: Record<string, number>;
  sensoryNotes: string;
  sensoryScores: { texture: number; color: number; taste: number };
  setChecklistState: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  setConditionalAnswers?: React.Dispatch<
    React.SetStateAction<Record<string, "pass" | "fail" | null>>
  >;
  setQcValues: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setRunValues: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setSensoryNotes: (val: string) => void;
  setSensoryScores: React.Dispatch<
    React.SetStateAction<{ texture: number; color: number; taste: number }>
  >;
  setStepLogs: React.Dispatch<
    React.SetStateAction<
      Record<string, { startTime?: number; completed?: boolean }>
    >
  >;
  stepLogs: Record<string, { startTime?: number; completed?: boolean }>;
}

const RunPhaseView: React.FC<RunPhaseViewProps> = ({
  activePhase,
  activeStep,
  runValues,
  setRunValues,
  qcValues,
  setQcValues,
  stepLogs,
  setStepLogs,
  conditionalAnswers = {},
  setConditionalAnswers,
  onTimerComplete,
}) => {
  const { t } = useTranslation();
  const inventoryItems = useQuery(api.inventory.list, {});

  if (!(activePhase && activeStep)) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <CheckCircle2 className="mb-4 text-emerald-500" size={48} />
        <h3 className="font-bold text-xl">{t("phase_complete")}</h3>
      </div>
    );
  }

  const isTimer = activeStep.type === "timer";
  const isConditional = activeStep.type === "conditional";
  const isProcess = activeStep.type === "process";
  const isWeighing = activeStep.type === "weighing";
  const isQC = activeStep.type === "critical_check";
  const isSpreadsheet = activeStep.type === "spreadsheet_note";

  const linkedItem =
    isWeighing && activeStep.ingredientId
      ? inventoryItems?.find((item) => item._id === activeStep.ingredientId)
      : null;

  const currentEnteredWeight =
    runValues[activeStep.id] || activeStep.expectedWeight || 0;
  const isStockInsufficient =
    linkedItem && currentEnteredWeight > linkedItem.stock;

  const log = stepLogs[activeStep.id];
  const isRunning = !!log?.startTime && !log?.completed;

  // --- Header icons and styles ---
  let PhaseIcon = Settings;
  let iconColor =
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

  if (isWeighing) {
    PhaseIcon = Scale;
    iconColor =
      "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
  }
  if (isTimer) {
    PhaseIcon = Clock;
    iconColor =
      "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
  }
  if (isProcess) {
    PhaseIcon = Settings;
    iconColor =
      "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
  }
  if (isQC) {
    PhaseIcon = ShieldCheck;
    iconColor =
      "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400";
  }
  if (isConditional) {
    PhaseIcon = CheckSquare;
    iconColor =
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400";
  }
  if (isSpreadsheet) {
    PhaseIcon = Table2;
    iconColor =
      "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400";
  }

  return (
    <div className="fade-in zoom-in-95 mx-auto max-w-3xl animate-in duration-300">
      {/* Dynamic Phase Header from Formulation */}
      <div className="mb-8 flex items-center gap-4 border-gray-200 border-b pb-6 dark:border-slate-700/50">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-[1rem] ${activePhase.color ? `bg-${activePhase.color}-100 text-${activePhase.color}-700 dark:bg-${activePhase.color}-900/30 dark:text-${activePhase.color}-400` : "bg-slate-100 text-slate-700"}`}
        >
          <span className="font-black text-xl">
            {activePhase.name.substring(0, 1).toUpperCase()}
          </span>
        </div>
        <div>
          <h5 className="font-bold text-gray-400 text-xs uppercase tracking-widest">
            {t("current_phase")}
          </h5>
          <h2 className="font-black text-2xl text-gray-900 dark:text-white">
            {activePhase.name}
          </h2>
        </div>
      </div>

      <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start gap-6">
          <div
            className={`${iconColor} flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl`}
          >
            <PhaseIcon size={32} />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h6 className="mb-1 font-bold text-slate-400 text-xs uppercase tracking-widest dark:text-slate-500">
                  {t("active_step")}
                </h6>
                <h2 className="mb-2 font-extrabold text-3xl text-gray-900 leading-tight dark:text-white">
                  {activeStep.label}
                </h2>
              </div>
              {activeStep.processSpeed && (
                <div className="text-end">
                  <p className="font-bold text-gray-500 text-xs uppercase">
                    {t("target_speed")}
                  </p>
                  <p className="font-bold font-mono text-gray-900 text-xl dark:text-white">
                    {activeStep.processSpeed}
                  </p>
                </div>
              )}
            </div>

            {activeStep.notes && (
              <div className="mb-8 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-gray-600 text-lg leading-relaxed dark:text-slate-300">
                  {activeStep.notes}
                </p>
              </div>
            )}

            {isSpreadsheet && (
              <MiniSpreadsheetEditor readOnly step={activeStep} />
            )}

            {/* WEIGHING UI */}
            {isWeighing && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-bold text-blue-800 text-sm uppercase tracking-wider opacity-60 dark:text-blue-300">
                    {t("target_mass")}
                  </span>
                  <span className="font-bold font-mono text-blue-900 text-xl dark:text-blue-200">
                    {activeStep.expectedWeight} {activeStep.unit}
                  </span>
                </div>

                {linkedItem && (
                  <div
                    className={`mb-5 flex items-center justify-between rounded-xl border p-4 shadow-sm transition-colors ${
                      isStockInsufficient
                        ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                        : "border-blue-100 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isStockInsufficient && (
                        <AlertCircle className="text-red-500" size={18} />
                      )}
                      <span className="font-bold text-sm">
                        {t("available_inventory")}
                      </span>
                    </div>
                    <span className="font-bold font-mono text-lg">
                      {linkedItem.stock} {linkedItem.unit}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <input
                    className="flex-1 rounded-xl border border-blue-200 bg-white px-6 py-4 text-end font-black font-mono text-2xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    data-testid="run-actual-weight-input"
                    onChange={(e) =>
                      setRunValues((prev) => ({
                        ...prev,
                        [activeStep.id]: Number.parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder={t("placeholder_0")}
                    type="number"
                    value={runValues[activeStep.id] || ""}
                  />
                  <span className="w-12 font-bold text-gray-500 text-lg">
                    {activeStep.unit}
                  </span>
                </div>
                {/* Tolerance indication */}
                {activeStep.expectedWeight !== undefined && (
                  <div className="mt-4 flex justify-between border-blue-200/50 border-t pt-4 font-bold text-blue-700 text-xs dark:border-slate-700/50 dark:text-blue-400">
                    <span>{t("tolerance_range")}</span>
                    <span>
                      {(
                        activeStep.expectedWeight -
                        (activeStep.tolerance ||
                          activeStep.expectedWeight * 0.05)
                      ).toFixed(2)}{" "}
                      -
                      {(
                        activeStep.expectedWeight +
                        (activeStep.tolerance ||
                          activeStep.expectedWeight * 0.05)
                      ).toFixed(2)}{" "}
                      {activeStep.unit}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* PROCESS UI */}
            {isProcess && (
              <div className="flex gap-4">
                {isRunning ? (
                  <div className="flex w-full animate-pulse flex-col items-center justify-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-6 text-orange-700 dark:border-orange-800/50 dark:bg-orange-900/20 dark:text-orange-300">
                    <Settings className="animate-spin" size={32} />
                    <span className="font-bold text-lg">
                      {t("process_currently_active")}
                    </span>
                  </div>
                ) : (
                  <button
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 py-4 font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] hover:bg-orange-500"
                    onClick={() =>
                      setStepLogs((prev) => ({
                        ...prev,
                        [activeStep.id]: { startTime: Date.now() },
                      }))
                    }
                  >
                    <Play fill="currentColor" size={20} /> {t("start_process")}
                  </button>
                )}
              </div>
            )}

            {/* TIMER UI */}
            {isTimer && (
              <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-inner">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-bold text-sm uppercase tracking-wider opacity-60">
                    {t("timer")}
                  </span>
                  <Clock className="opacity-60" size={20} />
                </div>
                {isRunning ? (
                  <TimerDisplay
                    initialTime={activeStep.durationSeconds || 60}
                    onComplete={() => {
                      onTimerComplete();
                      setStepLogs((prev) => ({
                        ...prev,
                        [activeStep.id]: {
                          ...prev[activeStep.id],
                          completed: true,
                        },
                      }));
                    }}
                  />
                ) : log?.completed ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-800 bg-emerald-900/30 py-4 font-bold text-emerald-400 text-xl">
                    <CheckCircle2 size={24} /> {t("timer_completed")}
                  </div>
                ) : (
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-bold transition-colors hover:bg-blue-500"
                    onClick={() =>
                      setStepLogs((prev) => ({
                        ...prev,
                        [activeStep.id]: { startTime: Date.now() },
                      }))
                    }
                  >
                    <Play fill="currentColor" size={18} /> {t("start_timer")}
                    {activeStep.durationSeconds}
                    {t("s")}
                  </button>
                )}
              </div>
            )}

            {/* CRITICAL QC CHECK UI */}
            {isQC && activeStep.criticalParams && (
              <div className="space-y-4">
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/10 dark:text-rose-400">
                  <AlertCircle className="shrink-0" size={20} />
                  <p className="font-bold text-sm">
                    {t("log_critical_control_points")}
                  </p>
                </div>
                {activeStep.criticalParams.map((param, idx) => (
                  <div
                    className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900/50"
                    key={idx}
                  >
                    <div>
                      <label className="mb-1 block font-bold text-gray-700 text-sm dark:text-slate-300">
                        {param.name}
                      </label>
                      <p className="font-mono text-gray-500 text-xs">
                        {t("limits")} {param.min ?? "N/A"} -{" "}
                        {param.max ?? "N/A"} {param.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        className="w-32 rounded-xl border border-gray-300 bg-white px-4 py-2 text-end font-mono text-xl outline-none focus:ring-2 focus:ring-rose-500 dark:border-slate-600 dark:bg-slate-800"
                        onChange={(e) =>
                          setQcValues((prev) => ({
                            ...prev,
                            [`${activeStep.id}-${param.name}`]:
                              Number.parseFloat(e.target.value),
                          }))
                        }
                        placeholder={t("placeholder_0")}
                        type="number"
                        value={qcValues[`${activeStep.id}-${param.name}`] || ""}
                      />
                      <span className="w-12 font-bold text-gray-500">
                        {param.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CONDITIONAL UI */}
            {isConditional && (
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/50">
                <h3 className="mb-2 text-center font-bold text-slate-500 text-xs uppercase tracking-widest">
                  {t("quality_control_validation")}
                </h3>
                <div className="flex gap-4">
                  <button
                    className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-xl py-5 font-black transition-all ${conditionalAnswers?.[activeStep.id] === "pass" ? "scale-105 border-transparent bg-emerald-600 text-white shadow-emerald-500/20 shadow-lg" : "border border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-emerald-900/20"}`}
                    onClick={() =>
                      setConditionalAnswers &&
                      setConditionalAnswers((prev) => ({
                        ...prev,
                        [activeStep.id]: "pass",
                      }))
                    }
                  >
                    <CheckCircle2 size={32} />

                    {t("pass")}
                  </button>
                  <button
                    className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-xl py-5 font-black transition-all ${conditionalAnswers?.[activeStep.id] === "fail" ? "scale-105 border-transparent bg-rose-600 text-white shadow-lg shadow-rose-500/20" : "border border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-rose-900/20"}`}
                    onClick={() =>
                      setConditionalAnswers &&
                      setConditionalAnswers((prev) => ({
                        ...prev,
                        [activeStep.id]: "fail",
                      }))
                    }
                  >
                    <XCircle size={32} />

                    {t("fail")}
                  </button>
                </div>
                {conditionalAnswers?.[activeStep.id] === "fail" &&
                  activeStep.onFail?.action === "redirect_dispose" && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-100 p-3 font-bold text-red-700 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                      <AlertCircle size={16} />{" "}
                      {t("failing_this_step_triggers_mandatory_bat")}
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunPhaseView;
