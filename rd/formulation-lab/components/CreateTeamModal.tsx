import { useMutation } from "convex/react";
import { AnimatePresence } from "framer-motion";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { useTeam } from "../context/TeamContext";
import { api } from "../convex/_generated/api";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isRTL } = useSettings();
  const { t } = useTranslation();

  const { setActiveTeamId } = useTeam();
  const navigate = useNavigate();
  const createTeam = useMutation(api.teams.create);

  const [teamName, setTeamName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!teamName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const teamId = await createTeam({ name: teamName.trim() });
      setActiveTeamId(teamId);
      setTeamName("");
      onClose();
      navigate("/"); // Redirect to dashboard
    } catch (error) {
      console.error("Failed to create team:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            exit="exit"
            initial="hidden"
            onClick={onClose}
            variants={overlayVariants}
          />
          <MotionDiv
            animate="visible"
            className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#1e293b]"
            exit="exit"
            initial="hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            variants={modalVariants}
          >
            <h3 className="mb-4 font-bold text-gray-900 text-xl dark:text-white">
              {t("createTeam")}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-slate-300">
                  {t("teamName")}
                </label>
                <input
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-indigo-500"
                  onChange={(e) => setTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && teamName.trim()) {
                      handleCreate();
                    }
                    if (e.key === "Escape") {
                      onClose();
                    }
                  }}
                  placeholder={t("example_team_name")}
                  type="text"
                  value={teamName}
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  className="rounded-xl px-4 py-2 font-medium text-gray-600 text-sm transition-colors hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  disabled={isSubmitting}
                  onClick={onClose}
                >
                  {t("cancel")}
                </button>
                <button
                  className="rounded-xl bg-gray-900 px-4 py-2 font-bold text-sm text-white shadow-gray-900/20 shadow-lg transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-600 dark:shadow-indigo-600/20 dark:hover:bg-indigo-500"
                  disabled={!teamName.trim() || isSubmitting}
                  onClick={handleCreate}
                >
                  {isSubmitting ? t("creating") : t("createTeam")}
                </button>
              </div>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateTeamModal;
