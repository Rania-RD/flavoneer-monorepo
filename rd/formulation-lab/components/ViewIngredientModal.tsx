import { useMutation } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { Copy, Edit2, FlaskConical, Trash2, X, AlertTriangle, CheckCircle, Eye, Lock, MoreVertical } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSettings } from "../context/SettingsContext";
import { api } from "../convex/_generated/api";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";
import type { IngredientListItem } from "../types";

interface ViewIngredientModalProps {
  ingredient: IngredientListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ViewIngredientModal: React.FC<ViewIngredientModalProps> = ({
  ingredient,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useSettings();
  const [actionsOpen, setActionsOpen] = useState(false);
  const updateStatus = useMutation(api.ingredients.updateStatus);
  const [localStatus, setLocalStatus] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (ingredient) {
      setLocalStatus(ingredient.status);
    }
  }, [ingredient]);

  if (!ingredient) {
    return null;
  }

  const currentStatus = localStatus !== undefined ? localStatus : ingredient.status;
  const isLocked = currentStatus === "Approved";
  const isAllergensMissing = !ingredient.allergenVerified;

  const handleApprove = async () => {
    try {
      await updateStatus({ id: ingredient._id, status: "Approved" });
      setLocalStatus("Approved");
      toast.success(t("ingredient_approved_success"));
    } catch (error) {
      toast.error(t("generic_error"));
    }
  };

  const handleRevert = async () => {
    try {
      await updateStatus({ id: ingredient._id, status: "Draft" });
      setLocalStatus("Draft");
      toast.success(t("ingredient_reverted_to_draft"));
    } catch (error) {
      toast.error(t("generic_error"));
    }
  };

  const labelClasses =
    "block text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-start";
  const valueClasses = "font-bold text-sm text-gray-900 dark:text-white text-start break-words";

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm dark:bg-black/60"
            exit="exit"
            initial="hidden"
            onClick={onClose}
            variants={overlayVariants}
          />

          <MotionDiv
            animate="visible"
            className="relative flex h-fit max-h-[90vh] w-[95%] max-w-4xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-[#1e293b]"
            exit="exit"
            initial="hidden"
            variants={modalVariants}
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-y-6 border-gray-100 border-b bg-[#FAF5F0] p-6 sm:p-8 dark:border-slate-700 dark:bg-[#1e293b]">
              <div
                className={`flex items-center ${isRTL ? "space-x-4 space-x-reverse" : "space-x-4"}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-indigo-600 text-white shadow-indigo-600/20 shadow-lg">
                  <FlaskConical size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 font-bold text-[10px] text-gray-600 uppercase tracking-wide dark:bg-slate-700/50 dark:text-slate-300">
                      {isLocked && <CheckCircle className="text-emerald-500" size={12} />}
                      {t("version_label")} V1
                    </span>
                    <span className={`rounded-md px-2.5 py-1 font-bold text-[10px] uppercase tracking-wide ${isLocked ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"}`}>
                      {t(isLocked ? "status_approved" : "status_draft")}
                    </span>
                  </div>
                  <h2 className="font-bold text-2xl text-gray-900 leading-tight dark:text-white">
                    {ingredient.name}
                  </h2>
                </div>
              </div>
              <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                {!isLocked ? (
                  <button
                    className="flex items-center gap-2 rounded-full bg-slate-800 px-5 py-2 font-bold text-white text-sm transition-colors hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    disabled={isAllergensMissing}
                    onClick={handleApprove}
                    type="button"
                  >
                    {t("approve_ingredient")}
                  </button>
                ) : (
                  <button
                    className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 font-bold text-amber-600 text-sm transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                    onClick={handleRevert}
                    type="button"
                  >
                    <Lock size={16} />
                    {t("revert_to_draft")}
                  </button>
                )}
                
                <button
                  className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 font-bold text-indigo-600 text-sm transition-colors hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30"
                  onClick={onEdit}
                  type="button"
                >
                  {isLocked ? <Eye size={16} /> : <Edit2 size={16} />}
                  {isLocked ? t("view_details") : t("edit_ingredient")}
                </button>

                <div className="h-6 w-px bg-gray-200 dark:bg-slate-700" />
                
                <div className="relative">
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    onClick={() => setActionsOpen(!actionsOpen)}
                    type="button"
                  >
                    <MoreVertical size={20} />
                  </button>
                  
                  <AnimatePresence>
                    {actionsOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActionsOpen(false)} />
                        <MotionDiv
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className={`absolute ${isRTL ? "left-0" : "right-0"} top-12 z-50 w-48 overflow-hidden rounded-2xl bg-white py-2 shadow-xl ring-1 ring-gray-900/5 dark:bg-slate-800 dark:ring-white/10`}
                        >
                          <button
                            className="flex w-full items-center gap-3 px-4 py-2.5 font-medium text-emerald-600 text-sm transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                            onClick={() => {
                              setActionsOpen(false);
                              onDuplicate();
                            }}
                            type="button"
                          >
                            <Copy size={16} />
                            {t("duplicate")}
                          </button>
                          <button
                            className="flex w-full items-center gap-3 px-4 py-2.5 font-medium text-red-600 text-sm transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                            onClick={() => {
                              setActionsOpen(false);
                              onDelete();
                            }}
                            type="button"
                          >
                            <Trash2 size={16} />
                            {t("delete")}
                          </button>
                        </MotionDiv>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-slate-700" />

                <button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  onClick={onClose}
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="custom-scrollbar flex-1 overflow-y-auto pt-6 px-8 pb-8">
              {!isLocked && isAllergensMissing && (
                <div className="mb-8 overflow-hidden rounded-[1.2rem] bg-[#ffebeb] dark:bg-red-950/40">
                  <div className="flex items-start gap-4 p-6">
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                        {t("approval_missing_allergens_title")}
                      </h4>
                      <div className="mt-3 flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-gray-900 dark:bg-gray-400" />
                        <p>{t("approval_missing_allergens_desc")}</p>
                      </div>
                      <button
                        className="mt-6 flex items-center gap-2 rounded-full bg-teal-500 px-6 py-2.5 font-bold text-white transition-opacity hover:opacity-90 dark:bg-teal-600"
                        onClick={onEdit}
                        type="button"
                      >
                        {t("take_me_to_allergens")}
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                           <Edit2 size={14} />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* General Info */}
                <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/40">
                  <h3 className="mb-5 font-bold text-lg text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700/50 pb-2">
                    <span className="border-b-2 border-indigo-500 pb-2.5">
                      {t("general_info")}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-5 gap-x-6">
                    <div>
                      <span className={labelClasses}>{t("name")}</span>
                      <p className={valueClasses} dir="auto">{ingredient.name}</p>
                    </div>
                    <div>
                      <span className={labelClasses}>{t("common_name")}</span>
                      <p className={valueClasses} dir="auto">
                        {ingredient.commonName || "—"}
                      </p>
                    </div>
                    <div>
                      <span className={labelClasses}>{t("ingredient_code")}</span>
                      <p className={`${valueClasses} font-mono`} dir="auto">
                        {ingredient.code || "—"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Labeling Data */}
                <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/40">
                  <h3 className="mb-5 font-bold text-lg text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700/50 pb-2">
                    <span className="border-b-2 border-purple-500 pb-2.5">
                      {t("labeling_data")}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
                    <div>
                      <span className={labelClasses}>{t("isn_ar")}</span>
                      <p className={valueClasses} dir="auto">
                        {ingredient.isnAr || "—"}
                      </p>
                    </div>
                    <div>
                      <span className={labelClasses}>{t("isn_en")}</span>
                      <p className={valueClasses} dir="auto">
                        {ingredient.isnEn || "—"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Manufacturing Info */}
                <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/40">
                  <h3 className="mb-5 font-bold text-lg text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700/50 pb-2">
                    <span className="border-b-2 border-blue-500 pb-2.5">
                      {t("manufacturing")}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-5 gap-x-6">
                    <div>
                      <span className={labelClasses}>{t("yield_percentage")}</span>
                      <p className={valueClasses} dir="auto">{ingredient.yieldAmount}%</p>
                    </div>
                    <div>
                      <span className={labelClasses}>{t("moisture_loss_percentage")}</span>
                      <p className={valueClasses} dir="auto">{ingredient.moistureLoss}%</p>
                    </div>
                    <div>
                      <span className={labelClasses}>{t("density_specific_gravity")}</span>
                      <p className={valueClasses} dir="auto">
                        {ingredient.density ?? 1.0}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Allergens Info */}
                <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/40">
                  <h3 className="mb-5 font-bold text-lg text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700/50 pb-2">
                    <span className="border-b-2 border-rose-500 pb-2.5">
                      {t("allergens_info")}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
                    <div>
                      <span className={labelClasses}>{t("allergens_list")}</span>
                      <p className={valueClasses} dir="auto">
                        {ingredient.allergenValues?.length ? ingredient.allergenValues.join(", ") : "—"}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ViewIngredientModal;
