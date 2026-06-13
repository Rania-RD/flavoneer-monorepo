import type React from "react";

export interface SwitchProps {
  checked: boolean;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  onChange: (checked: boolean) => void;
  size?: "md" | "lg";
}

const sizing = {
  md: {
    container: "h-6 w-12",
    handle: "top-1 start-1 h-4 w-4",
    translateContent: "translate-x-6 rtl:-translate-x-6",
  },
  lg: {
    container: "h-8 w-14",
    handle:
      "top-1 start-1 flex h-6 w-6 items-center justify-center text-indigo-500",
    translateContent: "translate-x-6 rtl:-translate-x-6",
  },
};

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = "md",
  className = "",
  icon,
}) => {
  const styles = sizing[size];

  return (
    <button
      aria-checked={checked}
      className={`relative rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
        styles.container
      } ${
        checked
          ? "bg-indigo-600 dark:bg-indigo-500"
          : "bg-gray-200 dark:bg-slate-700"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      role="switch"
      type="button"
    >
      <div
        className={`pointer-events-none absolute rounded-full bg-white shadow-sm transition-transform duration-300 ${
          styles.handle
        } ${checked ? styles.translateContent : "translate-x-0 rtl:translate-x-0"}`}
      >
        {icon && icon}
      </div>
    </button>
  );
};
