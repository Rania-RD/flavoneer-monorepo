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

  const commonClasses = `w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group relative flex-shrink-0 ${
    active
      ? "bg-black dark:bg-indigo-600 text-white shadow-lg shadow-black/20 dark:shadow-indigo-600/30 scale-105"
      : "text-gray-400 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-200"
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
