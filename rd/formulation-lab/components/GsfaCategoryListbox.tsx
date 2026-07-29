import { motion } from "framer-motion";
import { Check, LoaderCircle } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import {
  formatGsfaCategoryCode,
  type GsfaCategoryOption,
} from "../lib/regulatory/gsfaCategory";

export interface GsfaCategoryPopoverPosition {
  bottom?: number;
  inlineStart: number;
  maxHeight: number;
  top?: number;
  width: number;
}

interface GsfaCategoryListboxProps {
  activeIndex: number;
  inputId: string;
  isLoading: boolean;
  language?: "en" | "ar";
  listboxId: string;
  listboxRef: React.RefObject<HTMLDivElement>;
  onActiveIndexChange: (index: number) => void;
  onSelect: (category: GsfaCategoryOption) => void;
  options: GsfaCategoryOption[];
  position: GsfaCategoryPopoverPosition;
  selectedCode?: string;
}

export const GsfaCategoryListbox: React.FC<GsfaCategoryListboxProps> = ({
  activeIndex,
  inputId,
  isLoading,
  language,
  listboxId,
  listboxRef,
  onActiveIndexChange,
  onSelect,
  options,
  position,
  selectedCode,
}) => {
  const { i18n, t: defaultT } = useTranslation();
  const t = language ? i18n.getFixedT(language) : defaultT;

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="fixed z-[1000] overflow-hidden rounded-2xl border border-[#9FC8AC] bg-[#FFFDF4]/98 shadow-2xl shadow-[#102F27]/20 backdrop-blur-md dark:border-[#477665] dark:bg-[#102F27]/98"
      dir={language === "ar" ? "rtl" : undefined}
      exit={{ opacity: 0, scale: 0.98, y: -4 }}
      initial={{ opacity: 0, scale: 0.98, y: -4 }}
      lang={language}
      ref={listboxRef}
      style={{
        bottom: position.bottom,
        insetInlineStart: position.inlineStart,
        top: position.top,
        width: position.width,
      }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <div
        aria-busy={isLoading}
        aria-labelledby={inputId}
        className="overflow-y-auto p-2"
        id={listboxId}
        role="listbox"
        style={{ maxHeight: position.maxHeight }}
      >
        {options.map((category, index) => {
          const isActive = index === activeIndex;
          const isSelected = category.code === selectedCode;

          return (
            <button
              aria-selected={isSelected}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm transition-colors ${
                isActive
                  ? "bg-[#D2F2D4] text-[#173E33] dark:bg-[#285B4D] dark:text-[#FFFDF4]"
                  : "text-[#285B4D] hover:bg-[#EEF8EB] dark:text-[#C9E5D2] dark:hover:bg-[#173E33]"
              }`}
              data-testid={`gsfa-category-option-${category.code}`}
              id={`${listboxId}-option-${index}`}
              key={category.code}
              onClick={() => onSelect(category)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onActiveIndexChange(index)}
              role="option"
              type="button"
            >
              <span
                className="shrink-0 font-bold font-mono text-[#1C4A3C] dark:text-[#F5A623]"
                dir="ltr"
              >
                {formatGsfaCategoryCode(category.code)}
              </span>
              {category.name && (
                <>
                  <span aria-hidden="true" className="text-[#6E9484]">
                    ·
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {category.name}
                  </span>
                </>
              )}
              {isSelected && (
                <Check
                  aria-hidden="true"
                  className="ms-auto shrink-0 text-[#1C4A3C] dark:text-[#F5A623]"
                  size={16}
                />
              )}
            </button>
          );
        })}

        {isLoading && (
          <div
            className="flex items-center justify-center gap-2 px-4 py-6 text-[#527568] text-sm dark:text-[#A9CDB8]"
            role="status"
          >
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin"
              size={17}
            />
            {t("loading")}
          </div>
        )}

        {!isLoading && options.length === 0 && (
          <div
            className="px-4 py-6 text-center text-[#527568] text-sm dark:text-[#A9CDB8]"
            role="status"
          >
            {t("no_gsfa_categories_found")}
          </div>
        )}
      </div>
    </motion.div>
  );
};
