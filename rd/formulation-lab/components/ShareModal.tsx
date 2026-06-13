import { useMutation } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { Copy, Link, Shield, Users, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { api } from "../convex/_generated/api";
import { useToast } from "../hooks/useToast";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";

interface ShareModalProps {
  entityId: string;
  entityName: string;
  entityType: "project" | "run";
  isOpen: boolean;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  entityId,
  entityName,
  entityType,
}) => {
  const { isRTL } = useSettings();
  const { t } = useTranslation();
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const createLink = useMutation(api.sharedLinks.createLink);

  const getErrorMessage = useCallback(
    (error: unknown) =>
      error instanceof Error ? error.message : t("failed_to_generate_link"),
    [t]
  );

  const handleGenerateLink = useCallback(async () => {
    setIsGenerating(true);
    try {
      const token = await createLink({
        entityId,
        entityType,
        role,
      });

      const shareUrl = `${window.location.origin}/share/${token}`;
      setGeneratedLink(shareUrl);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  }, [createLink, entityId, entityType, getErrorMessage, role, toast]);

  const handleCopyLink = useCallback(() => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success(t("copiedToClipboard"));
    }
  }, [generatedLink, t]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setGeneratedLink(null);
        setRole("viewer");
      }, 300);
    }
  }, [isOpen]);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm dark:bg-black/60"
            exit="exit"
            initial="hidden"
            onClick={onClose}
            variants={overlayVariants}
          />
          <MotionDiv
            animate="visible"
            className="relative w-full max-w-md rounded-[2rem] border border-slate-100 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-[#1e293b]"
            exit="exit"
            initial="hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            variants={modalVariants}
          >
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <span className="flex items-center justify-center rounded-xl bg-white p-2 shadow-sm dark:bg-slate-800">
                    <Link size={20} />
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-xl dark:text-white">
                  {t(entityType === "project" ? "share_project" : "share_run")}
                </h3>
                <p className="mt-1 text-slate-500 text-sm dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {entityName}
                  </span>
                </p>
              </div>
              <button
                className="rounded-full bg-slate-100 p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {generatedLink ? (
                /* Generated Link View */
                <MotionDiv
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                  initial={{ opacity: 0, y: 10 }}
                >
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="mb-2 font-medium text-slate-700 text-sm dark:text-slate-300">
                      {t("anyone_with_this_link_can_access_as")}{" "}
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {t(role)}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 text-sm focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                        readOnly
                        value={generatedLink}
                      />
                      <button
                        className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/60"
                        onClick={handleCopyLink}
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>

                  <button
                    className="w-full rounded-xl border border-slate-200 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick={onClose}
                  >
                    {t("done")}
                  </button>
                </MotionDiv>
              ) : (
                <>
                  {/* Role Selector */}
                  <div className="space-y-3">
                    <label className="font-medium text-slate-700 text-sm dark:text-slate-300">
                      {t("who_can_access")}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all ${
                          role === "viewer"
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-slate-200 hover:border-blue-200 dark:border-slate-700 dark:hover:border-slate-600"
                        }`}
                        onClick={() => setRole("viewer")}
                      >
                        <Users
                          className={
                            role === "viewer"
                              ? "text-blue-500"
                              : "text-slate-400"
                          }
                          size={24}
                        />
                        <span
                          className={`font-semibold text-sm ${
                            role === "viewer"
                              ? "text-blue-700 dark:text-blue-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {t("viewer")}
                        </span>
                        <span className="text-center text-slate-400 text-xs">
                          {t("read_only_access")}
                        </span>
                      </button>

                      <button
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all ${
                          role === "editor"
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-slate-200 hover:border-blue-200 dark:border-slate-700 dark:hover:border-slate-600"
                        }`}
                        onClick={() => setRole("editor")}
                      >
                        <Shield
                          className={
                            role === "editor"
                              ? "text-blue-500"
                              : "text-slate-400"
                          }
                          size={24}
                        />
                        <span
                          className={`font-semibold text-sm ${
                            role === "editor"
                              ? "text-blue-700 dark:text-blue-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {t("editor")}
                        </span>
                        <span className="text-center text-slate-400 text-xs">
                          {t("can_edit_data")}
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-blue-500/20 shadow-lg transition-all hover:bg-blue-700 disabled:opacity-50"
                    disabled={isGenerating}
                    onClick={handleGenerateLink}
                  >
                    {isGenerating ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    ) : (
                      t("generate_link")
                    )}
                  </button>
                </>
              )}
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ShareModal;
