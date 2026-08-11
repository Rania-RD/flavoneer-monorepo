import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, Loader2, LogOut, UserRound } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
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
  const { profile, signOut } = useSettings();
  const { activeOrganizationId, organizations, setActiveOrganizationId } =
    useOrganization();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const activeOrganization = organizations.find(
    (organization) => organization._id === activeOrganizationId
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const openSettings = (scope: "organization" | "user") => {
    setIsOpen(false);
    navigate(`/settings?scope=${scope}`);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
      setIsSigningOut(false);
    }
  };

  return (
    <div
      className={`relative ${placement === "desktop" ? "w-full" : ""}`}
      ref={containerRef}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t("organization_account_menu")}
        className={
          placement === "desktop"
            ? "group relative mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d2f2d4]/10 p-0.5 transition-all duration-300 hover:scale-105 hover:bg-[#d2f2d4]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#143d32]"
            : "flex flex-col items-center gap-1 rounded-xl p-2 font-medium text-[#6f8e82] text-[10px] transition-colors hover:bg-[#d2f2d4]/45 hover:text-[#1c4a3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] dark:text-[#9abcae] dark:hover:bg-[#d2f2d4]/10 dark:hover:text-[#f7f4df]"
        }
        data-testid={`${placement}-profile-trigger`}
        onClick={() => {
          setIsTooltipVisible(false);
          setIsOpen((open) => !open);
        }}
        onMouseEnter={() => {
          if (placement === "desktop" && !isOpen && triggerRef.current) {
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
          isVisible={isTooltipVisible && !isOpen}
          rect={tooltipRect}
        />
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-label={t("organization_account_menu")}
            className={`absolute z-[70] w-[min(18.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.75rem] border border-[#1c4a3c]/10 bg-[#fffdf4]/98 p-2 shadow-[0_24px_70px_rgba(16,47,39,0.3)] backdrop-blur-xl dark:border-[#d2f2d4]/10 dark:bg-[#173e33]/98 ${
              placement === "desktop"
                ? "start-full bottom-0 ms-3 origin-bottom-left rtl:origin-bottom-right"
                : "end-0 bottom-full mb-3 origin-bottom-right rtl:origin-bottom-left"
            }`}
            data-testid={`${placement}-organization-menu`}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            role="menu"
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div className="px-3 pb-1.5 pt-2">
              <p className="font-bold text-[#6f8e82] text-[10px] uppercase tracking-[0.18em] dark:text-[#a9cbbb]">
                {t("organizations")}
              </p>
            </div>

            <div className="max-h-44 overflow-y-auto">
              {organizations.map((organization) => {
                const isActive = organization._id === activeOrganizationId;
                return (
                  <button
                    aria-checked={isActive}
                    aria-label={t("switch_to_organization", {
                      name: organization.name,
                    })}
                    className={`flex w-full items-center gap-3 rounded-[1.15rem] px-3 py-2.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] ${
                      isActive
                        ? "bg-[#d2f2d4] text-[#173e33] dark:bg-[#285b4d] dark:text-[#f7f4df]"
                        : "text-[#285b4d] hover:bg-[#eef8eb] dark:text-[#d2e7dc] dark:hover:bg-[#d2f2d4]/10"
                    }`}
                    key={organization._id}
                    onClick={() => {
                      setActiveOrganizationId(organization._id);
                      setIsOpen(false);
                    }}
                    role="menuitemradio"
                    type="button"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl font-extrabold text-xs ${
                        isActive
                          ? "bg-[#f5a623] text-[#173e33]"
                          : "bg-[#d2f2d4]/65 text-[#1c4a3c] dark:bg-[#d2f2d4]/10 dark:text-[#f5a623]"
                      }`}
                    >
                      {organization.avatarUrl ? (
                        <img
                          alt=""
                          className="h-full w-full object-cover"
                          src={organization.avatarUrl}
                        />
                      ) : (
                        getOrganizationInitials(organization.name)
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-sm">
                        {organization.name}
                      </span>
                      <span className="block truncate text-[11px] text-[#6f8e82] capitalize dark:text-[#a9cbbb]">
                        {t(organization.role)}
                      </span>
                    </span>
                    {isActive && (
                      <Check aria-hidden="true" size={17} strokeWidth={2.8} />
                    )}
                  </button>
                );
              })}
            </div>

            <hr className="my-1.5 h-px border-0 bg-[#1c4a3c]/10 dark:bg-[#d2f2d4]/10" />

            <button
              className="flex w-full items-center gap-3 rounded-[1.15rem] px-3 py-2.5 text-start font-semibold text-[#285b4d] text-sm transition-colors hover:bg-[#eef8eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] dark:text-[#d2e7dc] dark:hover:bg-[#d2f2d4]/10"
              onClick={() => openSettings("organization")}
              role="menuitem"
              type="button"
            >
              <Building2 aria-hidden="true" size={18} />
              <span>{t("organizationSettings")}</span>
            </button>
            <hr className="my-1.5 h-px border-0 bg-[#1c4a3c]/10 dark:bg-[#d2f2d4]/10" />
            <div className="px-3 pb-1 pt-1.5">
              <p className="font-bold text-[#6f8e82] text-[10px] uppercase tracking-[0.18em] dark:text-[#a9cbbb]">
                {t("account")}
              </p>
            </div>

            <button
              className="flex w-full items-center gap-3 rounded-[1.15rem] px-3 py-2.5 text-start transition-colors hover:bg-[#eef8eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] dark:hover:bg-[#d2f2d4]/10"
              onClick={() => openSettings("user")}
              role="menuitem"
              type="button"
            >
              <UserAvatar
                className="ring-1 ring-[#1c4a3c]/10 dark:ring-[#d2f2d4]/15"
                name={profile.name}
                seed={profile.email}
                size={36}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-[#173e33] text-sm dark:text-[#f7f4df]">
                  {profile.name}
                </span>
                <span className="block truncate text-[#6f8e82] text-[11px] dark:text-[#a9cbbb]">
                  {profile.email}
                </span>
              </span>
              <UserRound
                aria-hidden="true"
                className="text-[#6f8e82] dark:text-[#a9cbbb]"
                size={17}
              />
            </button>

            <button
              aria-busy={isSigningOut}
              className="flex w-full items-center gap-3 rounded-[1.15rem] px-3 py-2.5 text-start font-semibold text-[#a43f20] text-sm transition-colors hover:bg-[#ff7738]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7738] disabled:cursor-wait disabled:opacity-60 dark:text-[#ffc5b2]"
              disabled={isSigningOut}
              onClick={handleSignOut}
              role="menuitem"
              type="button"
            >
              {isSigningOut ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={18}
                />
              ) : (
                <LogOut
                  aria-hidden="true"
                  className="rtl:-scale-x-100"
                  size={18}
                />
              )}
              <span>{t(isSigningOut ? "signing_out" : "logout")}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SidebarProfileMenu;
