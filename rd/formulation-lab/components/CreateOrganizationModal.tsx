import { useMutation } from "convex/react";
import { AnimatePresence } from "framer-motion";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { useOrganization } from "../context/OrganizationContext";
import { api } from "@flavoneer/backend/api";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isRTL } = useSettings();
  const { t } = useTranslation();

  const { setActiveOrganizationId } = useOrganization();
  const navigate = useNavigate();
  const createOrganization = useMutation(api.organizations.create);

  const [organizationName, setOrganizationName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!organizationName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const organizationId = await createOrganization({ name: organizationName.trim() });
      setActiveOrganizationId(organizationId);
      setOrganizationName("");
      onClose();
      navigate("/"); // Redirect to dashboard
    } catch (error) {
      console.error("Failed to create organization:", error);
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
              {t("createOrganization")}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-slate-300">
                  {t("organizationName")}
                </label>
                <input
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-brand-accent/50"
                  onChange={(e) => setOrganizationName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && organizationName.trim()) {
                      handleCreate();
                    }
                    if (e.key === "Escape") {
                      onClose();
                    }
                  }}
                  placeholder={t("example_organization_name")}
                  type="text"
                  value={organizationName}
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
                  className="rounded-xl bg-gray-900 px-4 py-2 font-bold text-sm text-white shadow-gray-900/20 shadow-lg transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-accent dark:shadow-brand-accent/20 dark:hover:bg-brand-accent-hover"
                  disabled={!organizationName.trim() || isSubmitting}
                  onClick={handleCreate}
                >
                  {isSubmitting ? t("creating") : t("createOrganization")}
                </button>
              </div>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateOrganizationModal;
