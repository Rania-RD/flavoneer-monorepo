import { AnimatePresence } from "framer-motion";
import {
  Languages,
  Loader2,
  LogOut,
  type LucideIcon,
  Palette,
  User,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";
import AppearanceTab from "./profile/AppearanceTab";
import IdentityTab from "./profile/IdentityTab";
import LocalizationTab from "./profile/LocalizationTab";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProfileTabId = "identity" | "localization" | "appearance";

interface TabButtonProps {
  activeTab: ProfileTabId;
  icon: LucideIcon;
  id: ProfileTabId;
  label: string;
  onSelect: (id: ProfileTabId) => void;
  panelId: string;
}

const TabButton: React.FC<TabButtonProps> = ({
  activeTab,
  id,
  label,
  icon: Icon,
  onSelect,
  panelId,
}) => (
  <button
    aria-controls={panelId}
    aria-selected={activeTab === id}
    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-bold text-sm transition-all ${
      activeTab === id
        ? "bg-brand-mint text-brand-primary dark:bg-brand-accent/20 dark:text-brand-accent-hover"
        : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800"
    }`}
    onClick={() => onSelect(id)}
    role="tab"
    type="button"
  >
    <Icon aria-hidden="true" size={18} />
    {label}
  </button>
);

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const { profile, updateProfile, language, setLanguage, isRTL, signOut } =
    useSettings();
  const [activeTab, setActiveTab] = useState<ProfileTabId>("identity");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const titleId = useId();
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab("identity");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
      setIsSigningOut(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm dark:bg-black/60"
            exit="exit"
            initial="hidden"
            onClick={onClose}
            variants={overlayVariants}
          />

          <MotionDiv
            animate="visible"
            aria-labelledby={titleId}
            aria-modal="true"
            className="relative z-[1000] w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-white/50 bg-[#FDFCF6] shadow-2xl dark:border-slate-700 dark:bg-[#0f172a]"
            exit="exit"
            initial="hidden"
            role="dialog"
            variants={modalVariants}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-gray-100 border-b px-8 py-6 dark:border-slate-800">
              <div>
                <h2
                  className="font-bold text-2xl text-gray-900 dark:text-white"
                  id={titleId}
                >
                  {t("profileIdentity")}
                </h2>
                <p className="text-gray-500 text-sm dark:text-slate-400">
                  {t("manageCredentials")}
                </p>
              </div>
              <button
                aria-label={t("close")}
                className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:text-gray-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
                onClick={onClose}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex h-[500px] flex-col md:flex-row">
              {/* Sidebar */}
              <div className="w-full border-gray-100 border-e bg-white p-6 md:w-64 dark:border-slate-800 dark:bg-[#0f172a]">
                <div
                  aria-label={t("profileIdentity")}
                  className="space-y-2"
                  role="tablist"
                >
                  <TabButton
                    activeTab={activeTab}
                    icon={User}
                    id="identity"
                    label={t("identity")}
                    onSelect={setActiveTab}
                    panelId={panelId}
                  />
                  <TabButton
                    activeTab={activeTab}
                    icon={Languages}
                    id="localization"
                    label={t("localization")}
                    onSelect={setActiveTab}
                    panelId={panelId}
                  />
                  <TabButton
                    activeTab={activeTab}
                    icon={Palette}
                    id="appearance"
                    label={t("appearance")}
                    onSelect={setActiveTab}
                    panelId={panelId}
                  />
                </div>
              </div>

              {/* Content Area */}
              <div
                className="flex-1 overflow-y-auto bg-gray-50/50 p-8 dark:bg-[#1e293b]/50"
                id={panelId}
                role="tabpanel"
              >
                {activeTab === "identity" && (
                  <IdentityTab
                    profile={profile}
                    updateProfile={updateProfile}
                  />
                )}

                {activeTab === "localization" && (
                  <LocalizationTab
                    currentLanguage={language}
                    setLanguage={setLanguage}
                  />
                )}

                {activeTab === "appearance" && <AppearanceTab />}
              </div>
            </div>

            <div className="flex justify-end border-gray-100 border-t bg-white px-8 py-4 dark:border-slate-800 dark:bg-[#0f172a]">
              <button
                aria-busy={isSigningOut}
                className="inline-flex items-center gap-2 rounded-xl border border-[#bd4d28]/20 bg-[#ff7738]/10 px-5 py-3 font-bold text-[#a43f20] text-sm transition-all hover:bg-[#ff7738]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7738] disabled:cursor-wait disabled:opacity-60 dark:border-[#ffb39a]/20 dark:bg-[#ff7738]/10 dark:text-[#ffc5b2]"
                disabled={isSigningOut}
                onClick={handleSignOut}
                type="button"
              >
                {isSigningOut ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-[18px] w-[18px] animate-spin"
                  />
                ) : (
                  <LogOut
                    aria-hidden="true"
                    className="rtl-mirror-icon"
                    size={18}
                  />
                )}
                <span>{t("logout")}</span>
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ProfileSettingsModal;
