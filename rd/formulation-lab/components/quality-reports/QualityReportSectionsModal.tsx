import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import { useMutation } from "convex/react";
import { AnimatePresence } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Loader2,
  RotateCcw,
  Save,
  Settings2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/useToast";
import {
  MotionDiv,
  modalVariants,
  overlayVariants,
} from "../../lib/animations";
import {
  createDefaultQualityReportSections,
  type QualityReportSectionConfiguration,
  resolveQualityReportSections,
} from "./report-sections";

interface QualityReportSectionsModalProps {
  isOpen: boolean;
  language: "ar" | "en";
  onClose: () => void;
  organizationId: Id<"organizations">;
  sections: QualityReportSectionConfiguration[];
}

export function QualityReportSectionsModal({
  isOpen,
  language,
  onClose,
  organizationId,
  sections,
}: QualityReportSectionsModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const updateConfiguration = useMutation(
    api.qualityReportConfigurations.upsert
  );
  const [draft, setDraft] =
    useState<QualityReportSectionConfiguration[]>(sections);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(
        sections.map((section) => ({
          ...section,
          labelI18n: { ...section.labelI18n },
        }))
      );
    }
  }, [isOpen, sections]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, saving]);

  if (!(isOpen && typeof document !== "undefined")) {
    return null;
  }

  const visibleCount = draft.filter(({ visible }) => visible).length;
  const resolvedDraft = resolveQualityReportSections(draft, language, t);

  const moveSection = (index: number, offset: -1 | 1) => {
    const destination = index + offset;
    if (destination < 0 || destination >= draft.length) {
      return;
    }
    setDraft((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateConfiguration({ organizationId, sections: draft });
      toast.success(t("qc_reports_sections_saved"));
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(t("qc_reports_sections_save_failed"));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div
        aria-labelledby="quality-report-sections-title"
        aria-modal="true"
        className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5"
        dir={language === "ar" ? "rtl" : "ltr"}
        role="dialog"
      >
        <MotionDiv
          animate="visible"
          className="absolute inset-0 bg-[#102f27]/35 backdrop-blur-sm dark:bg-black/65"
          exit="exit"
          initial="hidden"
          onClick={saving ? undefined : onClose}
          variants={overlayVariants}
        />
        <MotionDiv
          animate="visible"
          className="relative z-[1000] flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] border border-[#1c4a3c]/10 bg-[#fffdf4] shadow-2xl dark:border-[#d2f2d4]/10 dark:bg-[#173e33]"
          exit="exit"
          initial="hidden"
          variants={modalVariants}
        >
          <header className="flex items-start gap-4 border-[#1c4a3c]/10 border-b px-6 py-5 sm:px-8 sm:py-6 dark:border-[#d2f2d4]/10">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef8eb] text-[#1c4a3c] dark:bg-[#285b4d] dark:text-[#f5a623]">
              <Settings2 aria-hidden="true" size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                className="font-bold font-display text-[#173e33] text-xl sm:text-2xl dark:text-[#f7f4df]"
                id="quality-report-sections-title"
              >
                {t("qc_reports_configure_sections")}
              </h2>
              <p className="mt-1 text-[#527568] text-sm dark:text-[#a9cbbb]">
                {t("qc_reports_configure_sections_description")}
              </p>
            </div>
            <button
              aria-label={t("close")}
              className="rounded-full p-2 text-[#527568] transition-colors hover:bg-[#eef8eb] hover:text-[#173e33] disabled:opacity-50 dark:text-[#a9cbbb] dark:hover:bg-[#285b4d] dark:hover:text-[#f7f4df]"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8">
            <p className="mb-4 text-[#527568] text-xs dark:text-[#a9cbbb]">
              {t("qc_reports_rename_language_hint")}
            </p>
            <div className="space-y-3">
              {draft.map((section, index) => {
                const resolved = resolvedDraft[index];
                const cannotHide = section.visible && visibleCount === 1;
                return (
                  <div
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.5rem] border border-[#1c4a3c]/10 bg-[#eef8eb]/65 p-3 dark:border-[#d2f2d4]/10 dark:bg-[#102f27]/45"
                    key={section.key}
                  >
                    <GripVertical
                      aria-hidden="true"
                      className="text-[#7e9d90] dark:text-[#789b8b]"
                      size={18}
                    />
                    <div className="min-w-0">
                      <label
                        className="mb-1.5 block font-bold text-[#173e33] text-xs dark:text-[#f7f4df]"
                        htmlFor={`quality-report-section-${section.key}`}
                      >
                        {t("qc_reports_section_name", { name: resolved.label })}
                      </label>
                      <input
                        className="min-h-11 w-full rounded-xl border border-[#1c4a3c]/12 bg-[#fffdf4] px-3 text-[#173e33] text-sm outline-none transition-shadow placeholder:text-[#7e9d90] focus:ring-2 focus:ring-[#ff7738]/45 dark:border-[#d2f2d4]/12 dark:bg-[#173e33] dark:text-[#f7f4df] dark:placeholder:text-[#789b8b]"
                        dir={language === "ar" ? "rtl" : "ltr"}
                        id={`quality-report-section-${section.key}`}
                        maxLength={80}
                        onChange={(event) => {
                          const value = event.target.value;
                          setDraft((current) =>
                            current.map((item) =>
                              item.key === section.key
                                ? {
                                    ...item,
                                    labelI18n: {
                                      ...item.labelI18n,
                                      [language]: value,
                                    },
                                  }
                                : item
                            )
                          );
                        }}
                        placeholder={resolved.title}
                        value={section.labelI18n[language] ?? ""}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <label className="relative inline-flex min-h-8 cursor-pointer items-center">
                        <input
                          aria-label={t("qc_reports_toggle_section", {
                            name: resolved.label,
                          })}
                          checked={section.visible}
                          className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          disabled={cannotHide}
                          onChange={(event) => {
                            const visible = event.target.checked;
                            setDraft((current) =>
                              current.map((item) =>
                                item.key === section.key
                                  ? { ...item, visible }
                                  : item
                              )
                            );
                          }}
                          type="checkbox"
                        />
                        <span className="relative h-6 w-11 rounded-full bg-[#b8ccbf] transition-colors after:absolute after:start-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#1c4a3c] peer-checked:after:translate-x-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-55 rtl:peer-checked:after:-translate-x-5 dark:bg-[#527568] dark:peer-checked:bg-[#f5a623]" />
                      </label>
                      <div className="flex gap-1">
                        <button
                          aria-label={t("qc_reports_move_section_up", {
                            name: resolved.label,
                          })}
                          className="rounded-lg border border-[#1c4a3c]/10 bg-[#fffdf4] p-1.5 text-[#527568] hover:text-[#173e33] disabled:opacity-30 dark:border-[#d2f2d4]/10 dark:bg-[#173e33] dark:text-[#a9cbbb] dark:hover:text-[#f7f4df]"
                          disabled={index === 0}
                          onClick={() => moveSection(index, -1)}
                          type="button"
                        >
                          <ArrowUp aria-hidden="true" size={15} />
                        </button>
                        <button
                          aria-label={t("qc_reports_move_section_down", {
                            name: resolved.label,
                          })}
                          className="rounded-lg border border-[#1c4a3c]/10 bg-[#fffdf4] p-1.5 text-[#527568] hover:text-[#173e33] disabled:opacity-30 dark:border-[#d2f2d4]/10 dark:bg-[#173e33] dark:text-[#a9cbbb] dark:hover:text-[#f7f4df]"
                          disabled={index === draft.length - 1}
                          onClick={() => moveSection(index, 1)}
                          type="button"
                        >
                          <ArrowDown aria-hidden="true" size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-[#1c4a3c]/10 border-t px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 dark:border-[#d2f2d4]/10">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#1c4a3c]/12 px-4 font-bold text-[#527568] text-xs hover:bg-[#eef8eb] hover:text-[#173e33] disabled:opacity-50 dark:border-[#d2f2d4]/12 dark:text-[#a9cbbb] dark:hover:bg-[#285b4d] dark:hover:text-[#f7f4df]"
              disabled={saving}
              onClick={() => setDraft(createDefaultQualityReportSections())}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={15} />
              {t("qc_reports_restore_section_defaults")}
            </button>
            <div className="flex gap-2">
              <button
                className="min-h-11 flex-1 rounded-xl px-4 font-bold text-[#527568] text-xs hover:bg-[#eef8eb] disabled:opacity-50 sm:flex-none dark:text-[#a9cbbb] dark:hover:bg-[#285b4d]"
                disabled={saving}
                onClick={onClose}
                type="button"
              >
                {t("cancel")}
              </button>
              <button
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1c4a3c] px-5 font-bold text-white text-xs shadow-[0_8px_22px_rgba(28,74,60,0.18)] disabled:cursor-wait disabled:opacity-60 sm:flex-none dark:bg-[#f5a623] dark:text-[#173e33]"
                disabled={saving}
                onClick={save}
                type="button"
              >
                {saving ? (
                  <Loader2
                    aria-hidden="true"
                    className="animate-spin"
                    size={15}
                  />
                ) : (
                  <Save aria-hidden="true" size={15} />
                )}
                {t("qc_reports_save_sections")}
              </button>
            </div>
          </footer>
        </MotionDiv>
      </div>
    </AnimatePresence>,
    document.body
  );
}
