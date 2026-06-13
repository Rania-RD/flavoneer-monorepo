import { useMutation } from "convex/react";
import { AnimatePresence } from "framer-motion";
import {
  Activity,
  FileSignature,
  Languages,
  type LucideIcon,
  User,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { api } from "../convex/_generated/api";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";
import { compressImage } from "../lib/imageUtils";
import ActivityTab from "./profile/ActivityTab";
import IdentityTab from "./profile/IdentityTab";
import LocalizationTab from "./profile/LocalizationTab";
import SignatureTab from "./profile/SignatureTab";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProfileTabId = "identity" | "signature" | "app" | "activity";

interface TabButtonProps {
  activeTab: ProfileTabId;
  icon: LucideIcon;
  id: ProfileTabId;
  isRTL: boolean;
  label: string;
  onSelect: (id: ProfileTabId) => void;
}

const TabButton: React.FC<TabButtonProps> = ({
  activeTab,
  id,
  label,
  icon: Icon,
  isRTL,
  onSelect,
}) => (
  <button
    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-bold text-sm transition-all ${
      activeTab === id
        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300"
        : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800"
    }`}
    onClick={() => onSelect(id)}
    type="button"
  >
    <Icon className={isRTL ? "ms-0" : ""} size={18} />
    {label}
  </button>
);

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const {
    profile,
    updateProfile,
    language,
    setLanguage,
    isRTL,
  } = useSettings();
  const [activeTab, setActiveTab] = useState<ProfileTabId>("identity");

  // Local state for form handling before save
  // No more local profile state for global save
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getFileUrl);

  // ─── Signature sub-mode state ───

  // ─── Upload helpers ───
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      setUploading(true);
      const compressedFile = await compressImage(file, 500);
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });
      const { storageId } = await result.json();
      const url = await getFileUrl({ storageId });
      if (url) {
        // Immediate update for Avatar
        updateProfile({ avatarUrl: url });
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploading(false);
      // Note: we can't easily reset the input ref here unless we pass it down or state lift logic differently
      // Since it's hidden inside the component, it's fine for now.
    }
  };

  const handleSignatureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      setUploading(true);
      const compressedFile = await compressImage(file, 500);
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });
      const { storageId } = await result.json();
      const url = await getFileUrl({ storageId });
      if (url) {
        // Immediate update for Signature Upload
        updateProfile({
          signatureType: "upload",
          signatureData: url,
        });
      }
    } catch (err) {
      console.error("Signature upload failed:", err);
    } finally {
      setUploading(false);
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
            className="relative z-[1000] w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-white/50 bg-[#FDFCF6] shadow-2xl dark:border-slate-700 dark:bg-[#0f172a]"
            exit="exit"
            initial="hidden"
            variants={modalVariants}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-gray-100 border-b px-8 py-6 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-2xl text-gray-900 dark:text-white">
                  {t("settings")}
                </h2>
                <p className="text-gray-500 text-sm dark:text-slate-400">
                  {t("manageCredentials")}
                </p>
              </div>
              <button
                className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:text-gray-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex h-[500px] flex-col md:flex-row">
              {/* Sidebar */}
              <div className="w-full border-gray-100 border-r bg-white p-6 md:w-64 dark:border-slate-800 dark:bg-[#0f172a]">
                <div className="space-y-2">
                  <TabButton
                    activeTab={activeTab}
                    icon={User}
                    id="identity"
                    isRTL={isRTL}
                    label={t("identity")}
                    onSelect={setActiveTab}
                  />
                  <TabButton
                    activeTab={activeTab}
                    icon={FileSignature}
                    id="signature"
                    isRTL={isRTL}
                    label={t("digitalSignature")}
                    onSelect={setActiveTab}
                  />
                  <TabButton
                    activeTab={activeTab}
                    icon={Languages}
                    id="app"
                    isRTL={isRTL}
                    label={t("localization")}
                    onSelect={setActiveTab}
                  />
                  <TabButton
                    activeTab={activeTab}
                    icon={Activity}
                    id="activity"
                    isRTL={isRTL}
                    label={t("activity")}
                    onSelect={setActiveTab}
                  />
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto bg-gray-50/50 p-8 dark:bg-[#1e293b]/50">
                {activeTab === "identity" && (
                  <IdentityTab
                    handleAvatarUpload={handleAvatarUpload}
                    profile={profile}
                    updateProfile={updateProfile}
                    uploading={uploading}
                  />
                )}

                {activeTab === "signature" && (
                  <SignatureTab
                    handleSignatureUpload={handleSignatureUpload}
                    profile={profile}
                    updateProfile={updateProfile}
                    uploading={uploading}
                  />
                )}

                {activeTab === "app" && (
                  <LocalizationTab
                    currentLanguage={language}
                    setLanguage={setLanguage}
                  />
                )}

                {activeTab === "activity" && <ActivityTab />}
              </div>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ProfileSettingsModal;
