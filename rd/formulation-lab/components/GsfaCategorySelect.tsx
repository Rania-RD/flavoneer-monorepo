import { useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { ChevronDown, Search, X } from "lucide-react";
import type React from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { api } from "@flavoneer/backend/api";
import {
  formatGsfaCategoryLabel,
  type GsfaCategoryOption,
  matchesGsfaCategory,
} from "../lib/regulatory/gsfaCategory";
import {
  GsfaCategoryListbox,
  type GsfaCategoryPopoverPosition,
} from "./GsfaCategoryListbox";

interface GsfaCategoryValue {
  code?: string;
  name?: string;
}

interface GsfaCategorySelectProps {
  inputClassName: string;
  labelClassName?: string;
  language?: "en" | "ar";
  onChange: (value: GsfaCategoryValue) => void;
  value: GsfaCategoryValue;
}

const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 12;
const POPOVER_FLIP_THRESHOLD = 144;
const MAX_POPOVER_HEIGHT = 320;
const MIN_POPOVER_WIDTH = 320;
const SEARCH_DEBOUNCE_MS = 160;

export const GsfaCategorySelect: React.FC<GsfaCategorySelectProps> = ({
  inputClassName,
  labelClassName,
  language,
  onChange,
  value,
}) => {
  const { i18n, t: defaultT } = useTranslation();
  const t = language ? i18n.getFixedT(language) : defaultT;
  const generatedId = useId().replaceAll(":", "");
  const inputId = `gsfa-category-input-${generatedId}`;
  const listboxId = `gsfa-category-listbox-${generatedId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [popoverPosition, setPopoverPosition] =
    useState<GsfaCategoryPopoverPosition | null>(null);

  const categories = useQuery(api.regulatory.searchFoodCategories, {
    search: debouncedSearch,
    limit: 80,
  });

  const selectedLabel = value.code
    ? formatGsfaCategoryLabel({
        code: value.code,
        name: value.name,
      })
    : "";

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const options = useMemo(() => {
    const optionsByCode = new Map<string, GsfaCategoryOption>();

    if (value.code) {
      optionsByCode.set(value.code, {
        code: value.code,
        name: value.name ?? "",
      });
    }

    for (const category of categories ?? []) {
      optionsByCode.set(category.code, {
        code: category.code,
        name: category.name,
      });
    }

    return Array.from(optionsByCode.values()).filter((category) =>
      matchesGsfaCategory(category, search)
    );
  }, [categories, search, value.code, value.name]);

  const closeCombobox = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    setPopoverPosition(null);
  }, []);

  const updatePopoverPosition = useCallback(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const rect = input.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const availableBelow =
      viewportHeight - rect.bottom - POPOVER_GAP - VIEWPORT_PADDING;
    const availableAbove = rect.top - POPOVER_GAP - VIEWPORT_PADDING;
    const shouldOpenAbove =
      availableBelow < POPOVER_FLIP_THRESHOLD &&
      availableAbove > availableBelow;
    const availableHeight = shouldOpenAbove ? availableAbove : availableBelow;
    const maxHeight = Math.max(
      0,
      Math.min(MAX_POPOVER_HEIGHT, availableHeight)
    );
    const width = Math.min(
      Math.max(rect.width, MIN_POPOVER_WIDTH),
      viewportWidth - VIEWPORT_PADDING * 2
    );
    const direction = window.getComputedStyle(input).direction;
    const anchorInlineStart =
      direction === "rtl" ? viewportWidth - rect.right : rect.left;
    const inlineStart = Math.min(
      Math.max(anchorInlineStart, VIEWPORT_PADDING),
      viewportWidth - width - VIEWPORT_PADDING
    );

    setPopoverPosition({
      bottom: shouldOpenAbove
        ? viewportHeight - rect.top + POPOVER_GAP
        : undefined,
      inlineStart,
      maxHeight,
      top: shouldOpenAbove ? undefined : rect.bottom + POPOVER_GAP,
      width,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePopoverPosition();

    const schedulePositionUpdate = () => {
      window.requestAnimationFrame(updatePopoverPosition);
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedulePositionUpdate);
    if (inputRef.current) {
      resizeObserver?.observe(inputRef.current);
    }

    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
    };
  }, [isOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const selectedIndex = options.findIndex(
      (category) => category.code === value.code
    );
    setActiveIndex(
      selectedIndex >= 0 ? selectedIndex : options.length ? 0 : -1
    );
  }, [isOpen, options, value.code]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        listboxRef.current?.contains(target)
      ) {
        return;
      }

      closeCombobox();
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [closeCombobox, isOpen]);

  const openCombobox = () => {
    setSearch("");
    setIsOpen(true);
  };

  const selectCategory = (category: GsfaCategoryOption) => {
    onChange({
      code: category.code,
      name: category.name,
    });
    closeCombobox();
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const clearSelection = () => {
    onChange({
      code: undefined,
      name: undefined,
    });
    closeCombobox();
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openCombobox();
        return;
      }
      setActiveIndex((current) =>
        options.length ? (current + 1) % options.length : -1
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openCombobox();
        return;
      }
      setActiveIndex((current) =>
        options.length ? (current - 1 + options.length) % options.length : -1
      );
      return;
    }

    if (event.key === "Home" && isOpen) {
      event.preventDefault();
      setActiveIndex(options.length ? 0 : -1);
      return;
    }

    if (event.key === "End" && isOpen) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }

    if (event.key === "Enter" && isOpen && activeIndex >= 0) {
      event.preventDefault();
      const category = options[activeIndex];
      if (category) {
        selectCategory(category);
      }
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      closeCombobox();
      return;
    }

    if (event.key === "Tab") {
      closeCombobox();
    }
  };

  const activeOptionId =
    isOpen && activeIndex >= 0
      ? `${listboxId}-option-${activeIndex}`
      : undefined;
  const isLoading =
    categories === undefined || debouncedSearch !== search.trim();
  const inputValue = isOpen ? search : selectedLabel;

  const popover =
    typeof document === "undefined"
      ? null
      : createPortal(
          <AnimatePresence>
            {isOpen && popoverPosition && (
              <GsfaCategoryListbox
                activeIndex={activeIndex}
                inputId={inputId}
                isLoading={isLoading}
                language={language}
                listboxId={listboxId}
                listboxRef={listboxRef}
                onActiveIndexChange={setActiveIndex}
                onSelect={selectCategory}
                options={options}
                position={popoverPosition}
                selectedCode={value.code}
              />
            )}
          </AnimatePresence>,
          document.body
        );

  return (
    <div
      className="space-y-2 text-start"
      dir={language === "ar" ? "rtl" : undefined}
      lang={language}
      ref={rootRef}
    >
      <label className={labelClassName} htmlFor={inputId}>
        {t("gsfa_category")}
      </label>
      <div className="group relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#6E9484] transition-colors group-focus-within:text-[#1C4A3C] dark:text-[#7FA895] dark:group-focus-within:text-[#F5A623]"
          size={16}
        />
        <input
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          autoComplete="off"
          className={`${inputClassName} ps-10 pe-20`}
          data-testid="gsfa-category-combobox"
          dir="auto"
          id={inputId}
          onChange={(event) => {
            setSearch(event.target.value);
            setIsOpen(true);
          }}
          onClick={() => {
            if (!isOpen) {
              openCombobox();
            }
          }}
          onFocus={() => {
            if (!isOpen) {
              openCombobox();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isOpen ? t("search_gsfa_category") : t("select_gsfa_category")
          }
          ref={inputRef}
          role="combobox"
          spellCheck={false}
          value={inputValue}
        />
        <div className="absolute inset-y-0 end-2 flex items-center gap-1">
          {value.code && (
            <button
              aria-label={t("clear_selection")}
              className="grid size-8 cursor-pointer place-items-center rounded-full text-[#6E9484] transition-colors hover:bg-[#D2F2D4] hover:text-[#1C4A3C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7738]/50 dark:text-[#A9CDB8] dark:hover:bg-[#285B4D] dark:hover:text-[#FFFDF4]"
              onClick={clearSelection}
              onMouseDown={(event) => event.preventDefault()}
              title={t("clear_selection")}
              type="button"
            >
              <X aria-hidden="true" size={15} />
            </button>
          )}
          <button
            aria-expanded={isOpen}
            aria-label={t("select_gsfa_category")}
            className="grid size-8 cursor-pointer place-items-center rounded-full text-[#527568] transition-colors hover:bg-[#D2F2D4] hover:text-[#1C4A3C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7738]/50 dark:text-[#A9CDB8] dark:hover:bg-[#285B4D] dark:hover:text-[#F5A623]"
            onClick={() => {
              if (isOpen) {
                closeCombobox();
                return;
              }
              inputRef.current?.focus();
              openCombobox();
            }}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <ChevronDown
              aria-hidden="true"
              className={`transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
              size={17}
            />
          </button>
        </div>
      </div>
      {popover}
    </div>
  );
};
