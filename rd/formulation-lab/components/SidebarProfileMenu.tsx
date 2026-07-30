import type React from "react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import NavTooltip from "./NavTooltip";
import ProfileSettingsModal from "./ProfileSettingsModal";

interface SidebarProfileMenuProps {
  placement: "desktop" | "mobile";
}

const SidebarProfileMenu: React.FC<SidebarProfileMenuProps> = ({
  placement,
}) => {
  const { t } = useTranslation();
  const { profile } = useSettings();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const avatarUrl =
    profile.avatarUrl ||
    `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(
      profile.name
    )}`;

  const openProfileModal = () => {
    setIsTooltipVisible(false);
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      <button
        aria-expanded={isProfileModalOpen}
        aria-haspopup="dialog"
        aria-label={t("profileIdentity")}
        className={
          placement === "desktop"
            ? "group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d2f2d4]/10 p-0.5 transition-all duration-300 hover:scale-105 hover:bg-[#d2f2d4]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#143d32]"
            : "flex flex-col items-center gap-1 rounded-xl p-2 font-medium text-[#6f8e82] text-[10px] transition-colors hover:bg-[#d2f2d4]/45 hover:text-[#1c4a3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] dark:text-[#9abcae] dark:hover:bg-[#d2f2d4]/10 dark:hover:text-[#f7f4df]"
        }
        data-testid={`${placement}-profile-trigger`}
        onClick={openProfileModal}
        onMouseEnter={() => {
          if (placement === "desktop" && triggerRef.current) {
            setTooltipRect(triggerRef.current.getBoundingClientRect());
            setIsTooltipVisible(true);
          }
        }}
        onMouseLeave={() => setIsTooltipVisible(false)}
        ref={triggerRef}
        type="button"
      >
        <img
          alt=""
          aria-hidden="true"
          className={
            placement === "desktop"
              ? "h-full w-full rounded-full object-cover ring-2 ring-[#f5a623]/70"
              : "h-6 w-6 rounded-full object-cover ring-1 ring-[#f5a623]/60"
          }
          height={44}
          src={avatarUrl}
          width={44}
        />
        {placement === "mobile" && <span>{t("profile")}</span>}
      </button>

      {placement === "desktop" && (
        <NavTooltip
          content={t("profile")}
          isVisible={isTooltipVisible && !isProfileModalOpen}
          rect={tooltipRect}
        />
      )}

      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
      />
    </>
  );
};

export default SidebarProfileMenu;
