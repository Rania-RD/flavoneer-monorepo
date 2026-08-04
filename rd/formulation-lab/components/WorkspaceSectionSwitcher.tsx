import { Check, ChevronDown, FlaskConical, ShieldCheck } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export type WorkspaceSection = "quality" | "research";

interface WorkspaceSectionSwitcherProps {
  activeSection: WorkspaceSection;
  onSectionChange: (section: WorkspaceSection) => void;
  placement: "header" | "rail";
}

const WorkspaceSectionSwitcher: React.FC<
  WorkspaceSectionSwitcherProps
> = ({ activeSection, onSectionChange, placement }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const sections: {
    description: string;
    icon: typeof FlaskConical;
    id: WorkspaceSection;
    label: string;
  }[] = [
    {
      id: "research",
      label: t("research_and_development"),
      description: t("research_and_development_description"),
      icon: FlaskConical,
    },
    {
      id: "quality",
      label: t("quality_control"),
      description: t("quality_control_description"),
      icon: ShieldCheck,
    },
  ];

  return (
    <div
      className={`relative ${placement === "header" ? "md:hidden" : ""}`}
      ref={containerRef}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t("switch_section")}
        className="group relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[1rem] bg-[#f5a623] text-[#173e33] shadow-[inset_0_-3px_0_rgba(182,97,8,0.28),0_10px_24px_rgba(0,0,0,0.18)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7738] focus-visible:ring-offset-2 focus-visible:ring-offset-[#143d32] active:translate-y-0"
        data-testid={`${placement}-section-selector`}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <FlaskConical size={21} strokeWidth={2.6} />
        <span className="absolute -end-1 -bottom-1 grid h-4 w-4 place-items-center rounded-full border-2 border-[#143d32] bg-[#fffdf4] shadow-sm dark:border-[#102f27]">
          <ChevronDown
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            size={10}
            strokeWidth={3}
          />
        </span>
      </button>

      {isOpen && (
        <div
          aria-label={t("section_selector")}
          className={`absolute z-[70] w-[18.5rem] overflow-hidden rounded-[1.75rem] border border-[#1c4a3c]/10 bg-[#fffdf4]/98 p-2 shadow-[0_24px_70px_rgba(16,47,39,0.24)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 dark:border-[#d2f2d4]/10 dark:bg-[#173e33]/98 ${
            placement === "rail"
              ? "start-full top-0 ms-3 origin-top-left rtl:origin-top-right"
              : "start-0 top-full mt-3 origin-top-left rtl:origin-top-right"
          }`}
          role="menu"
        >
          <div className="px-3 pb-2 pt-2">
            <p className="font-bold text-[#6f8e82] text-[10px] uppercase tracking-[0.18em] dark:text-[#a9cbbb]">
              {t("switch_section")}
            </p>
          </div>

          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeSection;
            return (
              <button
                aria-checked={isActive}
                className={`flex w-full items-center gap-3 rounded-[1.25rem] p-3 text-start transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623] ${
                  isActive
                    ? "bg-[#d2f2d4] text-[#173e33] shadow-[inset_0_0_0_1px_rgba(28,74,60,0.06)] dark:bg-[#f5a623]"
                    : "text-[#285b4d] hover:bg-[#eef8eb] dark:text-[#d2e7dc] dark:hover:bg-[#d2f2d4]/8"
                }`}
                key={section.id}
                onClick={() => {
                  onSectionChange(section.id);
                  setIsOpen(false);
                }}
                role="menuitemradio"
                type="button"
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-[0.9rem] ${
                    isActive
                      ? "bg-[#fffdf4]/70 text-[#173e33]"
                      : "bg-[#d2f2d4]/55 text-[#1c4a3c] dark:bg-[#d2f2d4]/10 dark:text-[#f5a623]"
                  }`}
                >
                  <Icon aria-hidden="true" size={19} strokeWidth={2.4} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-sm">
                    {section.label}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs leading-snug ${
                      isActive
                        ? "text-[#527568] dark:text-[#285b4d]"
                        : "text-[#6f8e82] dark:text-[#a9cbbb]"
                    }`}
                  >
                    {section.description}
                  </span>
                </span>
                {isActive && (
                  <Check aria-hidden="true" size={18} strokeWidth={2.8} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkspaceSectionSwitcher;
