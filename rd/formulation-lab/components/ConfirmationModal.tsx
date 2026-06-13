import { AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";

interface ConfirmationModalProps {
  cancelText?: string;
  confirmText?: string;
  isOpen: boolean;
  isProcessing?: boolean;
  message: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isProcessing = false,
}) => {
  const { isRTL } = useSettings();
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-red-900/10 backdrop-blur-sm dark:bg-black/60"
            exit="exit"
            initial="hidden"
            onClick={onClose}
            variants={overlayVariants}
          />
          <MotionDiv
            animate="visible"
            className="relative w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-[#1e293b]"
            exit="exit"
            initial="hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            variants={modalVariants}
          >
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                <Trash2 className="text-red-500 dark:text-red-400" size={32} />
              </div>

              {/* Heading */}
              <h3 className="mb-2 font-bold text-2xl text-gray-900 dark:text-white">
                {title}
              </h3>

              {/* Description */}
              <div className="mb-8 text-gray-500 leading-relaxed dark:text-slate-400">
                {message}
              </div>

              {/* Buttons */}
              <div className="flex w-full flex-col-reverse gap-3 sm:flex-row">
                <button
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-bold text-gray-600 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  disabled={isProcessing}
                  onClick={onClose}
                >
                  {cancelText ?? t("cancel")}
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 font-bold text-sm text-white shadow-lg shadow-red-500/20 transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700"
                  disabled={isProcessing}
                  onClick={onConfirm}
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      {t("deleting")}
                    </>
                  ) : (
                    (confirmText ?? t("confirm"))
                  )}
                </button>
              </div>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
