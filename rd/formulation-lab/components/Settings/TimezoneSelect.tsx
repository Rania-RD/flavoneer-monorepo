import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Clock3, Search } from "lucide-react";
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
import {
  getSupportedTimezones,
  getUserTimezone,
  matchesTimezone,
  type TimezoneOption,
} from "../../lib/timezones";

interface TimezoneSelectProps {
  onChange: (timezone: string) => void;
  value: string;
}

interface PopoverPosition {
  bottom?: number;
  inlineStart: number;
  maxHeight: number;
  top?: number;
  width: number;
}

const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 12;
const MAX_POPOVER_HEIGHT = 380;
const MIN_POPOVER_WIDTH = 340;

export function TimezoneSelect({ onChange, value }: TimezoneSelectProps) {
  const { i18n, t } = useTranslation();
  const generatedId = useId().replaceAll(":", "");
  const labelId = `timezone-label-${generatedId}`;
  const valueId = `timezone-value-${generatedId}`;
  const listboxId = `timezone-listbox-${generatedId}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const detectedTimezone = useMemo(getUserTimezone, []);
  const timezones = useMemo(() => getSupportedTimezones(value), [value]);
  const filteredTimezones = useMemo(
    () => timezones.filter((timezone) => matchesTimezone(timezone, query)),
    [query, timezones]
  );
  const selectedTimezone =
    timezones.find((timezone) => timezone.id === value) ?? timezones[0];

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setPosition(null);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const availableBelow =
      window.innerHeight - rect.bottom - POPOVER_GAP - VIEWPORT_PADDING;
    const availableAbove = rect.top - POPOVER_GAP - VIEWPORT_PADDING;
    const opensAbove = availableBelow < 240 && availableAbove > availableBelow;
    const maxHeight = Math.max(
      180,
      Math.min(MAX_POPOVER_HEIGHT, opensAbove ? availableAbove : availableBelow)
    );
    const width = Math.min(
      Math.max(rect.width, MIN_POPOVER_WIDTH),
      window.innerWidth - VIEWPORT_PADDING * 2
    );
    const direction = window.getComputedStyle(trigger).direction;
    const anchorInlineStart =
      direction === "rtl" ? window.innerWidth - rect.right : rect.left;
    const inlineStart = Math.min(
      Math.max(anchorInlineStart, VIEWPORT_PADDING),
      window.innerWidth - width - VIEWPORT_PADDING
    );

    setPosition({
      bottom: opensAbove
        ? window.innerHeight - rect.top + POPOVER_GAP
        : undefined,
      inlineStart,
      maxHeight,
      top: opensAbove ? undefined : rect.bottom + POPOVER_GAP,
      width,
    });
  }, []);

  const openDropdown = useCallback(() => {
    setQuery("");
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();
    const schedulePositionUpdate = () =>
      window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, true);

    return () => {
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!(isOpen && position)) {
      return;
    }
    searchRef.current?.focus();
  }, [isOpen, position]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const selectedIndex = filteredTimezones.findIndex(
      (timezone) => timezone.id === value
    );
    if (selectedIndex >= 0) {
      setActiveIndex(selectedIndex);
      return;
    }
    setActiveIndex(filteredTimezones.length ? 0 : -1);
  }, [filteredTimezones, isOpen, value]);

  useEffect(() => {
    if (!(isOpen && activeIndex >= 0)) {
      return;
    }
    popoverRef.current
      ?.querySelector<HTMLElement>(`#${listboxId}-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen, listboxId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      closeDropdown();
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [closeDropdown, isOpen]);

  const selectTimezone = (timezone: TimezoneOption) => {
    onChange(timezone.id);
    closeDropdown();
    triggerRef.current?.focus();
  };

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        filteredTimezones.length ? (current + 1) % filteredTimezones.length : -1
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        filteredTimezones.length
          ? (current - 1 + filteredTimezones.length) % filteredTimezones.length
          : -1
      );
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(filteredTimezones.length ? 0 : -1);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(filteredTimezones.length - 1);
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const timezone = filteredTimezones[activeIndex];
      if (timezone) {
        selectTimezone(timezone);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "Tab") {
      closeDropdown();
      triggerRef.current?.focus();
    }
  };

  const activeOptionId =
    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;
  const popover =
    typeof document === "undefined" || !(isOpen && position)
      ? null
      : createPortal(
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed z-[1000] overflow-hidden rounded-2xl border border-[#9fc8ac] bg-[#fffdf4]/98 shadow-2xl shadow-[#102f27]/20 backdrop-blur-md dark:border-[#477665] dark:bg-[#102f27]/98"
            dir={i18n.dir()}
            initial={{ opacity: 0, scale: 0.98, y: -4 }}
            ref={popoverRef}
            style={{
              bottom: position.bottom,
              insetInlineStart: position.inlineStart,
              top: position.top,
              width: position.width,
            }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.16,
              ease: "easeOut",
            }}
          >
            <div className="border-[#1c4a3c]/10 border-b p-3 dark:border-[#d2f2d4]/10">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#6e9484]"
                  size={16}
                />
                <input
                  aria-activedescendant={activeOptionId}
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-expanded="true"
                  aria-label={t("search_timezones")}
                  autoComplete="off"
                  className="w-full rounded-xl border border-[#1c4a3c]/12 bg-[#eef8eb] py-2.5 ps-10 pe-3 text-[#173e33] text-sm outline-none focus:ring-2 focus:ring-[#ff7738]/45 dark:border-[#d2f2d4]/10 dark:bg-[#285b4d] dark:text-[#f7f4df]"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t("search_timezones")}
                  ref={searchRef}
                  role="combobox"
                  value={query}
                />
              </div>
            </div>
            <div
              aria-label={t("timezone_options")}
              className="overflow-y-auto p-2"
              id={listboxId}
              role="listbox"
              style={{ maxHeight: position.maxHeight - 69 }}
            >
              {filteredTimezones.map((timezone, index) => {
                const isActive = index === activeIndex;
                const isSelected = timezone.id === value;
                const isDetected = timezone.id === detectedTimezone;

                return (
                  <button
                    aria-selected={isSelected}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors ${
                      isActive
                        ? "bg-[#d2f2d4] text-[#173e33] dark:bg-[#285b4d] dark:text-[#fffdf4]"
                        : "text-[#285b4d] hover:bg-[#eef8eb] dark:text-[#c9e5d2] dark:hover:bg-[#173e33]"
                    }`}
                    id={`${listboxId}-option-${index}`}
                    key={timezone.id}
                    onClick={() => selectTimezone(timezone)}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-bold text-sm">
                          {timezone.city}
                        </span>
                        {isDetected ? (
                          <span className="shrink-0 rounded-full bg-[#1c4a3c]/8 px-2 py-0.5 font-bold text-[10px] text-[#1c4a3c] dark:bg-[#f5a623]/15 dark:text-[#f5a623]">
                            {t("current_timezone")}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className="mt-0.5 block truncate text-[#527568] text-xs dark:text-[#a9cbbb]"
                        dir="ltr"
                      >
                        {timezone.id} · {timezone.offset}
                      </span>
                    </span>
                    {isSelected ? (
                      <Check
                        aria-hidden="true"
                        className="shrink-0 text-[#1c4a3c] dark:text-[#f5a623]"
                        size={17}
                      />
                    ) : null}
                  </button>
                );
              })}
              {filteredTimezones.length === 0 ? (
                <p
                  className="px-4 py-8 text-center text-[#527568] text-sm dark:text-[#a9cbbb]"
                  role="status"
                >
                  {t("no_timezones_found")}
                </p>
              ) : null}
            </div>
          </motion.div>,
          document.body
        );

  return (
    <div className="space-y-2">
      <span
        className="block font-bold text-[#527568] text-xs uppercase tracking-wider dark:text-[#a9cbbb]"
        id={labelId}
      >
        {t("timezone")}
      </span>
      <button
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={`${labelId} ${valueId}`}
        className="flex min-h-12 w-full items-center gap-3 rounded-[1rem] border border-[#1c4a3c]/12 bg-[#eef8eb] px-4 py-2.5 text-start outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[#ff7738]/45 dark:border-[#d2f2d4]/10 dark:bg-[#285b4d]"
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openDropdown();
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <Clock3
          aria-hidden="true"
          className="shrink-0 text-[#527568] dark:text-[#a9cbbb]"
          size={18}
        />
        <span className="min-w-0 flex-1" id={valueId}>
          <span className="block truncate font-bold text-[#173e33] text-sm dark:text-[#f7f4df]">
            {selectedTimezone?.city ?? value}
          </span>
          <span
            className="block truncate text-[#527568] text-xs dark:text-[#a9cbbb]"
            dir="ltr"
          >
            {selectedTimezone?.id ?? value} · {selectedTimezone?.offset}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`shrink-0 text-[#527568] transition-transform duration-200 dark:text-[#a9cbbb] ${
            isOpen ? "rotate-180" : ""
          }`}
          size={17}
        />
      </button>
      {popover}
    </div>
  );
}
