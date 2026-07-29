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
      <div className="isolation-isolate relative z-10 flex flex-col items-center overflow-visible rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#dff4dc] p-8 text-center shadow-[0_18px_55px_rgba(28,74,60,0.10)] transition-colors dark:border-[#d2f2d4]/10 dark:bg-[#173e33]">
        {/* Header Actions */}
        <div className="relative z-10 mb-6 flex w-full justify-end">
          {/* Profile Settings Gear */}
          <button
            className="rounded-full bg-[#fffdf4] p-2 text-[#527568] shadow-sm transition-transform hover:rotate-90 hover:text-[#173e33] dark:bg-[#285b4d] dark:text-[#b9d8c9] dark:hover:text-[#fffdf4]"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Profile Identity */}
        <div
          className="group relative z-10 mb-4 h-24 w-24 cursor-pointer rounded-full bg-[#fffdf4] p-1 shadow-md ring-4 ring-[#f5a623]/20 dark:bg-[#285b4d]"
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
          <h3 className="font-display font-black text-[#173e33] text-xl dark:text-[#f7f4df]">
            {profile.name}
          </h3>
          {isCreator && (
            <span className="flex items-center gap-1 rounded-full border border-[#f5a623]/35 bg-[#fff2cf] px-2.5 py-0.5 font-black text-[10px] text-[#8a5208] uppercase tracking-widest shadow-sm dark:border-[#f5a623]/25 dark:bg-[#f5a623]/12 dark:text-[#ffc760]">
              {t("creator")}
            </span>
          )}
        </div>
        <p className="relative z-10 mb-4 font-medium text-[#658579] text-sm dark:text-[#9abcae]">
          {profile.title}
        </p>

        {/* Logout */}
        <button
          className="relative z-10 flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-[#658579] text-xs transition-all hover:bg-[#ff7738]/10 hover:text-[#c9501a] dark:text-[#9abcae] dark:hover:bg-[#ff7738]/10 dark:hover:text-[#ffc5b2]"
          onClick={signOut}
        >
          <LogOut className="rtl-mirror-icon" size={14} />
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
