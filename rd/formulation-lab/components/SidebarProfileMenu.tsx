import type React from "react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "../context/OrganizationContext";
import { useSettings } from "../context/SettingsContext";
import { getOrganizationInitials } from "../lib/organization-icon";
import NavTooltip from "./NavTooltip";
import UserAvatar from "./user-avatar";

interface SidebarProfileMenuProps {
  placement: "desktop" | "mobile";
}

const SidebarProfileMenu: React.FC<SidebarProfileMenuProps> = ({
  placement,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useSettings();
  const { activeOrganizationId, organizations } = useOrganization();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const activeOrganization = organizations.find(
    (organization) => organization._id === activeOrganizationId
  );

  const openSettings = () => {
    setIsTooltipVisible(false);
    navigate("/settings?scope=user");
  };

  return (
    <>
      <button
        aria-label={t("profileIdentity")}
        className={
          placement === "desktop"
            ? "group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d2f2d4]/10 p-0.5 transition-all duration-300 hover:scale-105 hover:bg-[#d2f2d4]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#143d32]"
            : "flex flex-col items-center gap-1 rounded-xl p-2 font-medium text-[#6f8e82] text-[10px] transition-colors hover:bg-[#d2f2d4]/45 hover:text-[#1c4a3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] dark:text-[#9abcae] dark:hover:bg-[#d2f2d4]/10 dark:hover:text-[#f7f4df]"
        }
        data-testid={`${placement}-profile-trigger`}
        onClick={openSettings}
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
        <span
          className={
            placement === "desktop"
              ? "relative inline-flex h-10 w-10"
              : "relative inline-flex h-6 w-6"
          }
        >
          <UserAvatar
            className={
              placement === "desktop"
                ? "ring-2 ring-[#f5a623]/70"
                : "ring-1 ring-[#f5a623]/60"
            }
            name={profile.name}
            seed={profile.email}
            size={placement === "desktop" ? 40 : 24}
            testId={`${placement}-profile-avatar`}
          />
          {activeOrganization && (
            <span
              aria-label={t("organization_icon_for", {
                name: activeOrganization.name,
              })}
              className={`absolute -end-1 -bottom-1 flex items-center justify-center overflow-hidden rounded-full font-extrabold leading-none shadow-sm ring-2 ring-[#143d32] ${
                activeOrganization.avatarUrl
                  ? "bg-[#fffdf4] text-[#173e33] dark:bg-[#173e33]"
                  : "bg-[#f5a623] text-[#173e33]"
              } ${
                placement === "desktop"
                  ? "h-[18px] w-[18px] text-[7px]"
                  : "h-3.5 w-3.5 text-[6px] ring-[#fffdf4] dark:ring-[#143d32]"
              }`}
              data-testid={`${placement}-organization-badge`}
              role="img"
              title={activeOrganization.name}
            >
              {activeOrganization.avatarUrl ? (
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={activeOrganization.avatarUrl}
                />
              ) : (
                getOrganizationInitials(activeOrganization.name)
              )}
            </span>
          )}
        </span>
        {placement === "mobile" && <span>{t("profile")}</span>}
      </button>

      {placement === "desktop" && (
        <NavTooltip
          content={t("profile")}
          isVisible={isTooltipVisible}
          rect={tooltipRect}
        />
      )}
    </>
  );
};

export default SidebarProfileMenu;
