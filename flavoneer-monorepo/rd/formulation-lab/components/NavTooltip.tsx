import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";

interface NavTooltipProps {
  content: string;
  isVisible: boolean;
  rect: DOMRect | null;
}

const NavTooltip: React.FC<NavTooltipProps> = ({
  content,
  rect,
  isVisible,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!(mounted && isVisible && rect)) {
    return null;
  }

  // Calculate position: Fixed sidebar means X is stable.
  // LTR: Tooltip to the right of the item + margin
  // RTL: Tooltip to the left of the item - margin
  // Y is centered relative to the item

  const tooltipHeight = 32; // Approx height for centering calculation
  const top = rect.top + rect.height / 2 - tooltipHeight / 2;

  // Sidebar item is w-10 (40px).
  // We want it slightly offset.
  // If we use fixed positioning, we can just use rect.right + 12px.

  const style: React.CSSProperties = {
    position: "fixed",
    top: `${top}px`,
    zIndex: 10_050, // Higher than sidebar (30) and even modals if needed
    pointerEvents: "none",
  };

  if (isRTL) {
    style.right = `${window.innerWidth - rect.left + 12}px`;
  } else {
    style.left = `${rect.right + 16}px`;
  }

  return createPortal(
    <div
      className="fade-in zoom-in-95 animate-in whitespace-nowrap rounded-lg border border-white/10 bg-gray-900 px-3 py-1.5 font-medium text-white text-xs shadow-xl duration-200 dark:border-slate-700 dark:bg-slate-800"
      style={style}
    >
      {content}
    </div>,
    document.body
  );
};

export default NavTooltip;
