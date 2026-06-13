import { LogOut, Settings } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { usePermissions } from "../hooks/usePermissions";
import ProfileSettingsModal from "./ProfileSettingsModal";

const ProfileHeader: React.FC = () => {
  const { t } = useTranslation();
  const { profile, signOut } = useSettings();
  const { isCreator } = usePermissions();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  return (
    <>
      <div className="isolation-isolate relative z-10 flex flex-col items-center overflow-visible rounded-[2.5rem] border border-pink-200 bg-gray-100 p-8 text-center shadow-sm transition-colors dark:bg-[#1e293b]">
        {/* Header Actions */}
        <div className="relative z-10 mb-6 flex w-full justify-end">
          {/* Profile Settings Gear */}
          <button
            className="rounded-full bg-white p-2 text-gray-600 shadow-sm transition-transform hover:rotate-90 hover:text-gray-900 dark:bg-slate-700 dark:text-slate-300 dark:hover:text-white"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Profile Identity */}
        <div
          className="group relative z-10 mb-4 h-24 w-24 cursor-pointer rounded-full bg-white p-1 shadow-md dark:bg-slate-600"
          onClick={() => setIsProfileModalOpen(true)}
        >
          <img
            alt={t("profile")}
            className="h-full w-full rounded-full object-cover"
            src={
              profile.avatarUrl ||
              `https://api.dicebear.com/9.x/thumbs/svg?seed=${profile.name}`
            }
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 font-bold text-white text-xs opacity-0 transition-opacity group-hover:opacity-100">
            {t("edit")}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-2">
          <h3 className="font-bold text-gray-900 text-xl dark:text-slate-100">
            {profile.name}
          </h3>
          {isCreator && (
            <span className="flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-100 px-2.5 py-0.5 font-black text-[10px] text-indigo-700 uppercase tracking-widest shadow-sm dark:border-indigo-800/50 dark:bg-indigo-900/30 dark:text-indigo-400">
              {t("creator")}
            </span>
          )}
        </div>
        <p className="relative z-10 mb-4 font-medium text-gray-500 text-sm dark:text-slate-400">
          {profile.title}
        </p>

        {/* Logout */}
        <button
          className="relative z-10 flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-gray-500 text-xs transition-all hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          onClick={signOut}
        >
          <LogOut size={14} />
          {t("logout")}
        </button>

        <ProfileSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      </div>
    </>
  );
};

export default ProfileHeader;
