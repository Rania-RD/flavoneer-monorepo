import { type HTMLMotionProps, motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";

const MotionDiv = motion.div as React.FC<
  HTMLMotionProps<"div"> & {
    className?: string;
    children?: React.ReactNode;
  }
>;

interface BatchDisposalViewProps {
  failureReason: string;
  isSaving: boolean;
  onFailureReasonChange: (value: string) => void;
  onFinishRun: () => void;
}

const BatchDisposalView: React.FC<BatchDisposalViewProps> = ({
  failureReason,
  isSaving,
  onFailureReasonChange,
  onFinishRun,
}) => {
  const { t } = useTranslation();

  return (
    <MotionDiv
      animate={{ opacity: 1, scale: 1 }}
      className="flex h-screen flex-col items-center justify-center bg-rose-50/50 px-6 dark:bg-rose-950/20"
      exit={{ opacity: 0, scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-2xl dark:border-rose-800/50 dark:bg-slate-900">
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-rose-500 to-red-600" />

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
          <AlertTriangle size={40} />
        </div>

        <h2 className="mb-2 font-black text-3xl text-gray-900 tracking-tight dark:text-white">
          {t("batch_failure")}
        </h2>
        <p className="mb-8 text-gray-500 text-sm dark:text-slate-400">
          {t("this_batch_has_failed_a_critical_qc_chec")}
        </p>

        <div className="mb-8 space-y-2 text-start">
          <label
            className="ms-1 font-bold text-gray-700 text-sm dark:text-slate-300"
            htmlFor="failureReason"
          >
            {t("reason_for_failure")}
          </label>
          <textarea
            className="h-32 w-full resize-none rounded-xl border border-rose-200 bg-rose-50/30 px-4 py-3 text-gray-900 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-rose-800/50 dark:bg-rose-900/10 dark:text-white"
            id="failureReason"
            onChange={(event) => onFailureReasonChange(event.target.value)}
            placeholder={t("failure_reason_placeholder")}
            value={failureReason}
          />
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-4 font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-300"
          disabled={!failureReason || failureReason.length < 10}
          onClick={onFinishRun}
          type="button"
        >
          {isSaving ? (
            <Loader2 className="animate-spin" />
          ) : (
            <AlertTriangle size={18} />
          )}

          {t("terminate_discard_batch")}
        </button>
        <p className="mt-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest">
          {t("this_action_will_alert_supervisors")}
        </p>
      </div>
    </MotionDiv>
  );
};

export default BatchDisposalView;
