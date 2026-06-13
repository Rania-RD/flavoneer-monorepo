import { AnimatePresence, type HTMLMotionProps, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
} from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { modalVariants, overlayVariants } from "../../lib/animations";
import type {
  EnrichedProject,
  RunRecipePhase,
  RunRecipeStep,
} from "../../types";
import RunPhaseView from "./RunPhaseView";
import StepSidebar from "./StepSidebar";

const MotionDiv = motion.div as React.FC<
  HTMLMotionProps<"div"> & {
    className?: string;
    children?: React.ReactNode;
    onClick?: () => void;
  }
>;

interface RunValidation {
  bgColor: string;
  color: string;
  isValid: boolean;
  message: string;
}

interface ActiveRunViewProps {
  activePhase?: RunRecipePhase;
  activeStep?: RunRecipeStep;
  batchCode: string;
  checklistState: Record<string, boolean>;
  conditionalAnswers: Record<string, "pass" | "fail" | null>;
  currentPhaseIndex: number;
  currentStepIndex: number;
  isAbortModalOpen: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onAbortAnyway: () => void;
  onBackToSelection: () => void;
  onCloseAbortModal: () => void;
  onDraftSaved: () => void;
  onFinishRun: () => void;
  onNext: () => void;
  onSaveDraft: () => Promise<boolean | undefined>;
  onTimerComplete: () => void;
  onUnsavedBack: () => void;
  phases: RunRecipePhase[];
  qcValues: Record<string, number>;
  runValues: Record<string, number>;
  selectedProject: EnrichedProject;
  sensoryNotes: string;
  sensoryScores: { texture: number; color: number; taste: number };
  setChecklistState: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  setConditionalAnswers: React.Dispatch<
    React.SetStateAction<Record<string, "pass" | "fail" | null>>
  >;
  setCurrentPhaseIndex: (index: number) => void;
  setCurrentStepIndex: (index: number) => void;
  setQcValues: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setRunValues: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setSensoryNotes: (value: string) => void;
  setSensoryScores: React.Dispatch<
    React.SetStateAction<{ texture: number; color: number; taste: number }>
  >;
  setStepLogs: React.Dispatch<
    React.SetStateAction<
      Record<string, { startTime?: number; completed?: boolean }>
    >
  >;
  startTime: Date | null;
  stepLogs: Record<string, { startTime?: number; completed?: boolean }>;
  validation: RunValidation;
}

const getProgressWidth = (
  phases: RunRecipePhase[],
  currentPhaseIndex: number,
  currentStepIndex: number
) => {
  const completedStepsBeforePhase = phases
    .slice(0, currentPhaseIndex)
    .reduce((acc, phase) => acc + phase.steps.length, 0);
  const totalSteps = phases.reduce((acc, phase) => acc + phase.steps.length, 0);

  return Math.max(
    2,
    ((completedStepsBeforePhase + currentStepIndex + 1) /
      Math.max(1, totalSteps)) *
      100
  );
};

const ActiveRunView: React.FC<ActiveRunViewProps> = ({
  selectedProject,
  batchCode,
  startTime,
  phases,
  activePhase,
  activeStep,
  currentPhaseIndex,
  currentStepIndex,
  setCurrentPhaseIndex,
  setCurrentStepIndex,
  runValues,
  setRunValues,
  checklistState,
  setChecklistState,
  qcValues,
  setQcValues,
  stepLogs,
  setStepLogs,
  sensoryNotes,
  setSensoryNotes,
  sensoryScores,
  setSensoryScores,
  conditionalAnswers,
  setConditionalAnswers,
  onTimerComplete,
  validation,
  isSaving,
  isDirty,
  onUnsavedBack,
  onBackToSelection,
  isAbortModalOpen,
  onCloseAbortModal,
  onAbortAnyway,
  onSaveDraft,
  onDraftSaved,
  onFinishRun,
  onNext,
}) => {
  const { t } = useTranslation();
  const isFinalStep =
    currentPhaseIndex === phases.length - 1 &&
    activePhase &&
    currentStepIndex === activePhase.steps.length - 1;

  return (
    <MotionDiv
      animate={{ opacity: 1, scale: 1 }}
      className="flex h-screen flex-col bg-[#FDFCF6] dark:bg-[#0f172a]"
      exit={{ opacity: 0, scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <header className="z-10 flex items-center justify-between border-gray-200 border-b bg-white px-6 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-4">
          <button
            className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
            onClick={() => {
              if (isDirty) {
                onUnsavedBack();
              } else {
                onBackToSelection();
              }
            }}
            type="button"
          >
            <ArrowLeft className="text-gray-500" size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 text-lg dark:text-white">
                {selectedProject.name}
              </h2>
              <span className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-bold text-[10px] text-gray-500 dark:border-slate-600 dark:bg-slate-700">
                v{selectedProject.version}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-gray-500 text-xs dark:text-slate-400">
              {t("batch")} {batchCode} {t("started")}{" "}
              {startTime?.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4" />
      </header>

      <AnimatePresence>
        {isAbortModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <MotionDiv
              animate="visible"
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm dark:bg-black/80"
              exit="exit"
              initial="hidden"
              onClick={onCloseAbortModal}
              variants={overlayVariants}
            />

            <MotionDiv
              animate="visible"
              className="relative z-[1000] flex max-w-sm flex-col items-center rounded-[2rem] border border-white/50 bg-white p-8 text-center shadow-2xl dark:border-slate-700 dark:bg-[#0f172a]"
              exit="exit"
              initial="hidden"
              variants={modalVariants}
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <AlertTriangle size={32} />
              </div>
              <h3 className="mb-2 font-black text-gray-900 text-xl dark:text-white">
                {t("abort_run")}
              </h3>
              <p className="mb-8 font-medium text-gray-500 text-sm dark:text-slate-400">
                {t("are_you_sure_you_want_to_abort_this_run_")}
              </p>
              <div className="flex w-full gap-4">
                <button
                  className="flex-1 rounded-xl bg-gray-100 px-4 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  onClick={onCloseAbortModal}
                  type="button"
                >
                  {t("stay")}
                </button>
                <button
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-bold text-white shadow-lg shadow-red-500/20 transition-colors hover:bg-red-500"
                  onClick={onAbortAnyway}
                  type="button"
                >
                  {t("abort_anyway")}
                </button>
              </div>
            </MotionDiv>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
        <aside className="relative z-[60] hidden w-80 overflow-y-auto border-gray-200 border-r bg-white p-6 md:block dark:border-slate-700 dark:bg-slate-800">
          <StepSidebar
            activePhaseIndex={currentPhaseIndex}
            activeStepIndex={currentStepIndex}
            onPhaseSelect={setCurrentPhaseIndex}
            onStepSelect={setCurrentStepIndex}
            phases={phases}
          />
        </aside>

        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 pb-32 md:p-12">
            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                initial={{ opacity: 0, y: 10 }}
                key={`${activePhase?.id}-${activeStep?.id}`}
                transition={{ duration: 0.3 }}
              >
                {activePhase ? (
                  <RunPhaseView
                    activePhase={activePhase}
                    activeStep={activeStep}
                    checklistState={checklistState}
                    conditionalAnswers={conditionalAnswers}
                    onTimerComplete={onTimerComplete}
                    qcValues={qcValues}
                    runValues={runValues}
                    sensoryNotes={sensoryNotes}
                    sensoryScores={sensoryScores}
                    setChecklistState={setChecklistState}
                    setConditionalAnswers={setConditionalAnswers}
                    setQcValues={setQcValues}
                    setRunValues={setRunValues}
                    setSensoryNotes={setSensoryNotes}
                    setSensoryScores={setSensoryScores}
                    setStepLogs={setStepLogs}
                    stepLogs={stepLogs}
                  />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="pointer-events-auto z-[60] flex w-full shrink-0 flex-col items-center border-gray-200 border-t bg-white/90 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#0f172a]/90 dark:shadow-black/50">
            <div className="flex w-full flex-col items-center px-6 md:px-12">
              <div className="w-full max-w-4xl">
                <div className="h-1.5 w-full overflow-hidden rounded-b-lg bg-gray-100 dark:bg-slate-800">
                  <div
                    className="h-full bg-blue-600 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] dark:bg-blue-500"
                    style={{
                      width: `${getProgressWidth(
                        phases,
                        currentPhaseIndex,
                        currentStepIndex
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex w-full flex-col items-center justify-between gap-6 py-5 sm:flex-row">
                  <div className="flex w-full items-center gap-5 sm:w-auto">
                    <div
                      className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-inset transition-colors duration-300 ${validation.isValid ? "bg-green-50 text-green-600 ring-green-500/30 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20" : "bg-blue-50 text-blue-600 ring-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20"}`}
                    >
                      {validation.isValid ? (
                        <Check size={28} strokeWidth={2.5} />
                      ) : (
                        <Loader2
                          className="animate-spin"
                          size={28}
                          strokeWidth={2.5}
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="mb-1 truncate font-bold text-gray-500 text-xs uppercase tracking-widest dark:text-slate-400">
                        {activePhase?.name || t("initialization")} {t("step")}{" "}
                        {currentStepIndex + 1}
                      </span>
                      <span className="truncate font-bold text-base text-gray-900 lg:text-lg dark:text-white">
                        {validation.message ||
                          activeStep?.label ||
                          t("ready_to_proceed")}
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full flex-shrink-0 items-center gap-3 sm:w-auto">
                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-4 font-bold text-gray-700 text-sm uppercase tracking-wide shadow-sm transition-all will-change-transform hover:bg-gray-50 active:scale-95 disabled:opacity-50 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      disabled={isSaving}
                      onClick={async () => {
                        const success = await onSaveDraft();
                        if (success) {
                          onDraftSaved();
                        }
                      }}
                      type="button"
                    >
                      {isSaving ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : null}

                      {t("save_draft")}
                    </button>

                    {isFinalStep ? (
                      <button
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-green-600 px-8 py-4 font-black text-sm text-white uppercase tracking-wide shadow-green-600/20 shadow-xl transition-all will-change-transform hover:bg-green-500 active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 sm:w-auto disabled:dark:bg-slate-800"
                        data-testid="finish-save-run-button"
                        disabled={isSaving || !validation.isValid}
                        onClick={onFinishRun}
                        type="button"
                      >
                        {isSaving ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <FileText size={20} />
                        )}

                        {t("finish_save_run")}
                      </button>
                    ) : (
                      <button
                        className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 font-black text-sm text-white uppercase tracking-wide shadow-blue-600/20 shadow-xl transition-all will-change-transform hover:bg-blue-500 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 sm:w-auto disabled:dark:bg-slate-800"
                        disabled={!validation.isValid}
                        onClick={onNext}
                        type="button"
                      >
                        {t("nextStep")}
                        <ArrowRight
                          className="transition-transform duration-300 group-hover:translate-x-1.5"
                          size={20}
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </MotionDiv>
  );
};

export default ActiveRunView;
