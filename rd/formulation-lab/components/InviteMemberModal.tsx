import { useMutation } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { Mail, Shield, User, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { useTeam } from "../context/TeamContext";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useToast } from "../hooks/useToast";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isRTL } = useSettings();
  const { t } = useTranslation();
  const { activeTeamId } = useTeam();

  const { toast } = useToast();

  const createInvite = useMutation(api.teamInvites.create);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!(email.trim() && activeTeamId)) {
      return;
    }
    setLoading(true);
    setError("");

    try {
      const result = await createInvite({
        teamId: activeTeamId as Id<"teams">,
        email: email.trim(),
        role,
      });
      setInviteToken(result.token);
      toast.success(t("inviteSent"), { description: `${email} — ${t(role)}` });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteToken) {
      return;
    }
    const link = `${window.location.origin}${window.location.pathname}#/invite/${inviteToken}`;
    navigator.clipboard.writeText(link);
    toast.info(t("copiedToClipboard"));
  };

  const handleClose = () => {
    setEmail("");
    setRole("member");
    setError("");
    setInviteToken(null);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
          onClick={handleClose}
        >
          {/* Backdrop */}
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm dark:bg-black/60"
            exit="exit"
            initial="hidden"
            variants={overlayVariants}
          />

          {/* Dialog */}
          <MotionDiv
            animate="visible"
            className="relative z-[1000] w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-[#1e293b]"
            exit="exit"
            initial="hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            variants={modalVariants}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-8 pb-0">
              <div>
                <h2 className="font-bold text-gray-900 text-xl dark:text-slate-100">
                  {t("inviteMember")}
                </h2>
                <p className="mt-1 text-gray-500 text-sm dark:text-slate-400">
                  {t("sendInvite")}
                </p>
              </div>
              <button
                className="rounded-full bg-gray-50 p-2 transition-colors hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600"
                onClick={handleClose}
              >
                <X className="text-gray-500 dark:text-slate-400" size={18} />
              </button>
            </div>

            <div className="space-y-6 p-8">
              {inviteToken ? (
                /* ─── Success: show invite link ─── */
                <div className="space-y-4">
                  <div className="rounded-[1.5rem] bg-emerald-50 p-6 text-center dark:bg-emerald-900/20">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-800/40">
                      <Mail
                        className="text-emerald-600 dark:text-emerald-400"
                        size={24}
                      />
                    </div>
                    <p className="font-bold text-emerald-800 text-sm dark:text-emerald-300">
                      {t("inviteSent")}
                    </p>
                    <p className="mt-1 text-emerald-600 text-xs dark:text-emerald-400">
                      {email}
                    </p>
                  </div>

                  <div>
                    <label className="font-bold text-gray-400 text-xs uppercase tracking-wider dark:text-slate-500">
                      {t("inviteLink")}
                    </label>
                    <div className="mt-2 flex gap-2">
                      <input
                        className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-gray-600 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        readOnly
                        value={`${window.location.origin}${window.location.pathname}#/invite/${inviteToken}`}
                      />
                      <button
                        className="flex-shrink-0 rounded-lg bg-gray-900 px-4 py-2.5 font-bold text-white text-xs transition-colors hover:bg-gray-800 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                        onClick={handleCopyLink}
                      >
                        {t("copy")}
                      </button>
                    </div>
                  </div>

                  <button
                    className="w-full rounded-2xl bg-gray-100 py-3.5 font-bold text-gray-700 text-sm transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    onClick={handleClose}
                  >
                    {t("cancel")}
                  </button>
                </div>
              ) : (
                /* ─── Invite form ─── */
                <>
                  {/* Email input */}
                  <div>
                    <label className="mb-2 block font-bold text-gray-400 text-xs uppercase tracking-wider dark:text-slate-500">
                      {t("emailAddress")}
                    </label>
                    <input
                      autoFocus
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 text-sm placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-500/50"
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && email.trim()) {
                          handleSubmit();
                        }
                      }}
                      placeholder={t("example_email")}
                      type="email"
                      value={email}
                    />
                  </div>

                  {/* Role picker — segmented control */}
                  <div>
                    <label className="mb-2 block font-bold text-gray-400 text-xs uppercase tracking-wider dark:text-slate-500">
                      {t("selectRole")}
                    </label>
                    <div className="flex rounded-[1.5rem] bg-gray-50 p-1.5 dark:bg-slate-700">
                      <button
                        className={`flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] px-4 py-3 font-semibold text-sm transition-all duration-200 ${
                          role === "member"
                            ? "bg-white text-gray-900 shadow-md dark:bg-slate-600 dark:text-white"
                            : "text-gray-400 dark:text-slate-400"
                        }`}
                        onClick={() => setRole("member")}
                      >
                        <User size={16} />
                        {t("member")}
                      </button>
                      <button
                        className={`flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] px-4 py-3 font-semibold text-sm transition-all duration-200 ${
                          role === "admin"
                            ? "bg-white text-gray-900 shadow-md dark:bg-slate-600 dark:text-white"
                            : "text-gray-400 dark:text-slate-400"
                        }`}
                        onClick={() => setRole("admin")}
                      >
                        <Shield size={16} />
                        {t("admin")}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-xl bg-red-50 px-4 py-2 text-red-600 text-sm dark:bg-red-900/20 dark:text-red-400">
                      {error}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      className="flex-1 py-3.5 font-bold text-gray-500 text-sm transition-colors hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                      onClick={handleClose}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      className="flex-1 rounded-2xl bg-gray-900 py-3.5 font-bold text-sm text-white shadow-gray-900/20 shadow-lg transition-all hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-indigo-600 dark:shadow-indigo-600/30 dark:hover:bg-indigo-500"
                      disabled={!email.trim() || loading}
                      onClick={handleSubmit}
                    >
                      {loading ? "..." : t("sendInvite")}
                    </button>
                  </div>
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

export default InviteMemberModal;
