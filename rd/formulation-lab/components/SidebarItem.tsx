import type { LucideIcon } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import NavTooltip from "./NavTooltip";

interface SidebarItemProps {
  active?: boolean;
  className?: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  to?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  active,
  to,
  onClick,
  className,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useSettings();
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      setRect(ref.current.getBoundingClientRect());
    }
    setIsHovered(true);
  };

  const commonClasses = `w-9 h-9 border flex items-center justify-center transition-colors group relative flex-shrink-0 ${
    active
      ? "border-slate-950 bg-slate-950 text-white dark:border-sky-600 dark:bg-sky-600"
      : "border-transparent text-slate-400 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
  } ${className || ""}`;

  const iconElement = (
    <Icon
      className={isRTL ? "-scale-x-100 transform" : ""}
      size={20}
      strokeWidth={active ? 2.5 : 2}
    />
  );

  return (
    <>
      {to ? (
        <Link
          className={commonClasses}
          onClick={onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setIsHovered(false)}
          ref={ref as React.RefObject<HTMLAnchorElement>}
          to={to}
        >
          {iconElement}
        </Link>
      ) : (
        <button
          className={commonClasses}
          onClick={onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setIsHovered(false)}
          ref={ref as React.RefObject<HTMLButtonElement>}
        >
          {iconElement}
        </button>
      )}

      <NavTooltip content={label} isVisible={isHovered} rect={rect} />
    </>
  );
};

export default SidebarItem;
