import { type HTMLMotionProps, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";

const MotionDiv = motion.div as React.FC<
  HTMLMotionProps<"div"> & {
    className?: string;
    children?: React.ReactNode;
  }
>;

const RunCompletedView: React.FC = () => {
  const { t } = useTranslation();

  return (
    <MotionDiv
      animate={{ opacity: 1, scale: 1 }}
      className="flex h-screen flex-col items-center justify-center bg-[#FDFCF6] px-6 dark:bg-[#0f172a]"
      exit={{ opacity: 0, scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-green-200 bg-white p-10 text-center shadow-2xl dark:border-green-800/50 dark:bg-slate-900">
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-green-400 to-emerald-600" />

        <MotionDiv
          animate={{ scale: 1 }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          initial={{ scale: 0 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <Check size={48} strokeWidth={3} />
        </MotionDiv>

        <h2 className="mb-2 font-black text-3xl text-gray-900 tracking-tight dark:text-white">
          {t("batch_completed_successfully")}
        </h2>
        <p className="mb-6 text-gray-500 text-sm dark:text-slate-400">
          {t("redirecting_to_dashboard")}
        </p>
        <Loader2 className="mx-auto animate-spin text-green-500" size={24} />
      </div>
    </MotionDiv>
  );
};

export default RunCompletedView;
