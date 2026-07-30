import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Settings } from "lucide-react";
import type React from "react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { usePermissions } from "../hooks/usePermissions";
import NavTooltip from "./NavTooltip";
import ProfileSettingsModal from "./ProfileSettingsModal";

interface SidebarProfileMenuProps {
  placement: "desktop" | "mobile";
}

interface PopoverPosition {
  inlineStart: number;
  top: number;
  width: number;
}

const VIEWPORT_PADDING = 12;
const POPOVER_GAP = 12;
const POPOVER_MAX_WIDTH = 320;
const POPOVER_ESTIMATED_HEIGHT = 280;

const SidebarProfileMenu: React.FC<SidebarProfileMenuProps> = ({
  placement,
}) => {
  const { t } = useTranslation();
  const { isRTL, profile, signOut } = useSettings();
  const { isCreator } = usePermissions();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] =
    useState<PopoverPosition | null>(null);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const avatarUrl =
    profile.avatarUrl ||
    `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(
      profile.name
    )}`;

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const width = Math.min(
      POPOVER_MAX_WIDTH,
      window.innerWidth - VIEWPORT_PADDING * 2
    );
    const height =
      menuRef.current?.getBoundingClientRect().height ??
      POPOVER_ESTIMATED_HEIGHT;
    const opensAbove =
      placement === "mobile" ||
      triggerRect.bottom + POPOVER_GAP + height >
        window.innerHeight - VIEWPORT_PADDING;

    const preferredTop = opensAbove
      ? triggerRect.top - height - POPOVER_GAP
      : triggerRect.bottom + POPOVER_GAP;
    const top = Math.min(
      Math.max(preferredTop, VIEWPORT_PADDING),
      Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING)
    );

    const contentSide = isRTL
      ? triggerRect.left - width - POPOVER_GAP
      : triggerRect.right + POPOVER_GAP;
    const oppositeSide = isRTL
      ? triggerRect.right + POPOVER_GAP
      : triggerRect.left - width - POPOVER_GAP;
    const centered = triggerRect.left + triggerRect.width / 2 - width / 2;
    let preferredInlinePosition = centered;
    if (placement === "desktop") {
      const contentSideFits =
        contentSide >= VIEWPORT_PADDING &&
        contentSide + width <= window.innerWidth - VIEWPORT_PADDING;
      preferredInlinePosition = contentSideFits ? contentSide : oppositeSide;
    }
    const physicalLeft = Math.min(
      Math.max(preferredInlinePosition, VIEWPORT_PADDING),
      window.innerWidth - width - VIEWPORT_PADDING
    );
    const inlineStart = isRTL
      ? window.innerWidth - physicalLeft - width
      : physicalLeft;

    setPopoverPosition({ inlineStart, top, width });
  }, [isRTL, placement]);

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePopoverPosition();
    const frame = window.requestAnimationFrame(updatePopoverPosition);
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !(
          menuRef.current?.contains(target) ||
          triggerRef.current?.contains(target)
        )
      ) {
        closeMenu();
      }
    };
    const handleViewportChange = () => updatePopoverPosition();

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closeMenu, isOpen, updatePopoverPosition]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const menuItems = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)'
      ) ?? []
    );
    const currentIndex = menuItems.indexOf(
      document.activeElement as HTMLButtonElement
    );

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    if (event.key === "Tab") {
      window.setTimeout(() => {
        if (!menuRef.current?.contains(document.activeElement)) {
          closeMenu();
        }
      });
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    if (event.key === "Home") {
      menuItems.at(0)?.focus();
      return;
    }
    if (event.key === "End") {
      menuItems.at(-1)?.focus();
      return;
    }

    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      (currentIndex + direction + menuItems.length) % menuItems.length;
    menuItems[nextIndex]?.focus();
  };

  const handleTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      setIsOpen(true);
      setIsTooltipVisible(false);
    }
  };

  const openProfileSettings = () => {
    closeMenu();
    setIsProfileModalOpen(true);
  };

  const handleSignOut = () => {
    closeMenu();
    signOut();
  };

  const popover =
    isMounted &&
    createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-label={t("profileIdentity")}
            className="fixed z-[1000] overflow-hidden rounded-[2rem] border border-[#1c4a3c]/12 bg-[#fffdf4]/98 p-2 shadow-[0_24px_70px_rgba(16,47,39,0.28)] outline-none backdrop-blur-xl dark:border-[#d2f2d4]/12 dark:bg-[#102f27]/98 dark:shadow-black/40"
            data-testid={`${placement}-profile-menu`}
            dir={isRTL ? "rtl" : "ltr"}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            id={menuId}
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            onKeyDown={handleMenuKeyDown}
            ref={menuRef}
            role="menu"
            style={
              popoverPosition
                ? {
                    insetInlineStart: popoverPosition.inlineStart,
                    top: popoverPosition.top,
                    width: popoverPosition.width,
                  }
                : {
                    opacity: 0,
                    pointerEvents: "none",
                    width: Math.min(
                      POPOVER_MAX_WIDTH,
                      window.innerWidth - VIEWPORT_PADDING * 2
                    ),
                  }
            }
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div
              className="rounded-[1.5rem] bg-[#dff4dc] p-4 dark:bg-[#173e33]"
              role="presentation"
            >
              <div className="flex min-w-0 items-center gap-3">
                <img
                  alt={t("profile")}
                  className="h-14 w-14 shrink-0 rounded-full bg-[#fffdf4] object-cover p-0.5 shadow-md ring-2 ring-[#f5a623]/45 dark:bg-[#285b4d]"
                  height={56}
                  src={avatarUrl}
                  width={56}
                />
                <div className="min-w-0 text-start">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-black font-display text-[#173e33] text-lg dark:text-[#f7f4df]">
                      {profile.name}
                    </p>
                    {isCreator && (
                      <span className="rounded-full border border-[#f5a623]/35 bg-[#fff2cf] px-2 py-0.5 font-black text-[#8a5208] text-[9px] uppercase tracking-wider dark:border-[#f5a623]/25 dark:bg-[#f5a623]/12 dark:text-[#ffc760]">
                        {t("creator")}
                      </span>
                    )}
                  </div>
                  {profile.title && (
                    <p className="truncate font-bold text-[#527568] text-xs dark:text-[#a9cbbb]">
                      {profile.title}
                    </p>
                  )}
                  <p className="mt-0.5 truncate text-[#6f8e82] text-[11px] dark:text-[#8fb3a4]">
                    {profile.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2 space-y-1" role="presentation">
              <button
                className="flex w-full items-center gap-3 rounded-[1rem] px-4 py-3 text-start font-bold text-[#285b4d] text-sm transition-colors hover:bg-[#d2f2d4]/65 focus-visible:bg-[#d2f2d4]/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] dark:text-[#c8e4d4] dark:focus-visible:bg-[#d2f2d4]/10 dark:hover:bg-[#d2f2d4]/10"
                onClick={openProfileSettings}
                role="menuitem"
                type="button"
              >
                <Settings aria-hidden="true" size={18} />
                <span>{t("settings")}</span>
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-[1rem] px-4 py-3 text-start font-bold text-[#bd4d28] text-sm transition-colors hover:bg-[#ff7738]/10 focus-visible:bg-[#ff7738]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7738] dark:text-[#ffc5b2]"
                onClick={handleSignOut}
                role="menuitem"
                type="button"
              >
                <LogOut
                  aria-hidden="true"
                  className="rtl-mirror-icon"
                  size={18}
                />
                <span>{t("logout")}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );

  return (
    <>
      <button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t("profile")}
        className={
          placement === "desktop"
            ? "group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d2f2d4]/10 p-0.5 transition-all duration-300 hover:scale-105 hover:bg-[#d2f2d4]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#143d32]"
            : "flex flex-col items-center gap-1 rounded-xl p-2 font-medium text-[#6f8e82] text-[10px] transition-colors hover:bg-[#d2f2d4]/45 hover:text-[#1c4a3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] dark:text-[#9abcae] dark:hover:bg-[#d2f2d4]/10 dark:hover:text-[#f7f4df]"
        }
        data-testid={`${placement}-profile-trigger`}
        onClick={() => {
          const nextIsOpen = !isOpen;
          setIsOpen(nextIsOpen);
          setIsTooltipVisible(false);
        }}
        onKeyDown={handleTriggerKeyDown}
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
          isVisible={isTooltipVisible && !isOpen}
          rect={tooltipRect}
        />
      )}

      {popover}

      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};

export default SidebarProfileMenu;
