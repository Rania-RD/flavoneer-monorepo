import type { LucideIcon } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import NavTooltip from "./NavTooltip";

interface SidebarItemProps {
  active?: boolean;
  className?: string;
  directionalIcon?: boolean;
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
  directionalIcon = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      setRect(ref.current.getBoundingClientRect());
    }
    setIsHovered(true);
  };

  const commonClasses = `w-11 h-11 rounded-[1rem] flex items-center justify-center transition-all duration-300 group relative flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#143d32] ${
    active
      ? "scale-105 bg-[#f5a623] text-[#173e33] shadow-[inset_0_-3px_0_rgba(182,97,8,0.24),0_10px_24px_rgba(0,0,0,0.2)]"
      : "text-[#a9cbbb] hover:bg-[#d2f2d4]/10 hover:text-[#fffdf4]"
  } ${className || ""}`;

  const iconElement = (
    <Icon
      className={directionalIcon ? "rtl-mirror-icon" : undefined}
      size={20}
      strokeWidth={active ? 2.5 : 2}
    />
  );

  return (
    <>
      {to ? (
        <Link
          aria-label={label}
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
          aria-label={label}
          className={commonClasses}
          onClick={onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setIsHovered(false)}
          ref={ref as React.RefObject<HTMLButtonElement>}
          type="button"
        >
          {iconElement}
        </button>
      )}

      <NavTooltip content={label} isVisible={isHovered} rect={rect} />
    </>
  );
};

export default SidebarItem;
