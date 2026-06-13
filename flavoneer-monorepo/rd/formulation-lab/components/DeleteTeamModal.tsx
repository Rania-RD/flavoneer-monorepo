import { AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";

interface DeleteTeamModalProps {
  isDeleting?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  teamName?: string;
}

const DeleteTeamModal: React.FC<DeleteTeamModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  teamName,
  isDeleting = false,
}) => {
  const { isRTL } = useSettings();
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-pink-500/10 backdrop-blur-sm"
            exit="exit"
            initial="hidden"
            onClick={onClose}
            variants={overlayVariants}
          />
          <MotionDiv
            animate="visible"
            className="relative w-full max-w-md rounded-[2rem] border border-pink-100 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-[#1e293b]"
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
                {t("delete_laboratory")}
              </h3>

              {/* Description */}
              <p className="mb-8 text-gray-500 leading-relaxed dark:text-slate-400">
                {t("this_action_will_permanently_remove")}{" "}
                <span className="font-semibold text-gray-900 dark:text-slate-200">
                  {teamName || t("this_laboratory")}
                </span>{" "}
                {t("from_your_r_d_workspace_this_cannot_be_u")}
              </p>

              {/* Buttons */}
              <div className="flex w-full flex-col-reverse gap-3 sm:flex-row">
                <button
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-bold text-gray-600 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  disabled={isDeleting}
                  onClick={onClose}
                >
                  {t("keep_team")}
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF85A1] px-4 py-3 font-bold text-sm text-white shadow-lg shadow-pink-500/20 transition-colors hover:bg-[#ff6b8e] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isDeleting}
                  onClick={onConfirm}
                >
                  {isDeleting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      {t("deleting")}
                    </>
                  ) : (
                    t("yes_delete_team")
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

export default DeleteTeamModal;
