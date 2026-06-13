import { type HTMLMotionProps, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Check, Share2 } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "../../convex/_generated/dataModel";
import { modalVariants } from "../../lib/animations";
import type { RunRecord } from "../../types";
import { SensoryBuilder } from "../SensoryBuilder";
import ShareModal from "../ShareModal";
import SensoryRadarChartWrapper from "./sensory-radar-chart-wrapper";

const MotionDiv = motion.div as React.FC<
  HTMLMotionProps<"div"> & {
    className?: string;
    children?: React.ReactNode;
  }
>;

interface RunDetailViewProps {
  isShareModalOpen: boolean;
  onBackToSelection: () => void;
  onCloseShareModal: () => void;
  onOpenShareModal: () => void;
  selectedRunRecord: RunRecord;
}

const RunDetailView: React.FC<RunDetailViewProps> = ({
  selectedRunRecord,
  isShareModalOpen,
  onBackToSelection,
  onOpenShareModal,
  onCloseShareModal,
}) => {
  const { t } = useTranslation();

  return (
    <MotionDiv
      animate="visible"
      className="mx-auto flex h-screen max-w-7xl flex-col bg-[#FDFCF6] px-4 py-8 dark:bg-[#0f172a]"
      exit="exit"
      initial="hidden"
      variants={modalVariants}
    >
      <div className="mb-6 flex items-center justify-between border-b pb-6 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
            onClick={onBackToSelection}
            type="button"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-3xl text-gray-900 tracking-tight dark:text-white">
                {selectedRunRecord.projectName || t("unknown_project")}
              </h1>
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-bold text-sm ${
                  selectedRunRecord.status === "completed"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {selectedRunRecord.status === "completed" && (
                  <Check size={14} />
                )}
                {selectedRunRecord.status === "failed" && (
                  <AlertTriangle size={14} />
                )}
                {selectedRunRecord.status || t("completed")}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-2 font-medium text-gray-500 text-sm dark:text-slate-400">
              <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                {t("batch")} {selectedRunRecord.batchCode}
              </span>
              <span>•</span>
              <span>{selectedRunRecord.durationString || t("not_applicable")}</span>
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-gray-700 text-sm shadow-sm transition-colors hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          onClick={onOpenShareModal}
          type="button"
        >
          <Share2 size={16} /> {t("share_run")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pe-2">
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SensoryBuilder
            projectId={selectedRunRecord.projectId as Id<"projects">}
            runId={selectedRunRecord.id as Id<"runs">}
          />

          <SensoryRadarChartWrapper
            runId={selectedRunRecord.id as Id<"runs">}
          />
        </div>

        {selectedRunRecord.phases?.map((phase, phaseIndex) => (
          <div
            className="mb-6 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1e293b]"
            key={phase.id || phaseIndex}
          >
            <h3 className="mb-4 font-bold text-gray-900 text-xl dark:text-white">
              {phaseIndex + 1}. {phase.name}
            </h3>
            <div className="space-y-3">
              {phase.steps?.map((step, stepIndex) => {
                const actualVal = selectedRunRecord.data?.[step.id];
                const hasValue = actualVal !== undefined && actualVal !== null;

                return (
                  <div
                    className="flex items-center justify-between rounded-xl border border-gray-50 bg-gray-50/50 p-4 dark:border-slate-800/50 dark:bg-slate-800/20"
                    key={step.id || stepIndex}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 font-bold text-indigo-600 text-sm dark:bg-indigo-900/30 dark:text-indigo-400">
                        {stepIndex + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {step.label}
                        </p>
                        {step.expectedWeight && (
                          <p className="font-medium text-gray-500 text-xs dark:text-slate-400">
                            {t("target")} {step.expectedWeight} {step.unit}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-end">
                      {hasValue ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-lg dark:text-white">
                            {actualVal} {step.unit}
                          </span>
                          {step.isCompleted && (
                            <Check className="text-green-500" size={16} />
                          )}
                        </div>
                      ) : (
                        <span className="font-medium text-gray-400 text-sm italic dark:text-slate-500">
                          {t("no_data")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ShareModal
        entityId={selectedRunRecord.id}
        entityName={selectedRunRecord.projectName || t("unknown_project")}
        entityType="run"
        isOpen={isShareModalOpen}
        onClose={onCloseShareModal}
      />
    </MotionDiv>
  );
};

export default RunDetailView;
