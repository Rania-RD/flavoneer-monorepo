import { useMutation } from "convex/react";
import { AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Package,
  Save,
  Thermometer,
  Truck,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { api } from "../convex/_generated/api";
import { MotionDiv, modalVariants, overlayVariants } from "../lib/animations";
import type { EnrichedInventoryItem } from "../types";

interface EditMaterialModalProps {
  item: EnrichedInventoryItem | null;
  onClose: () => void;
}

const CATEGORIES = [
  "Stabilizers",
  "Acids",
  "Sweeteners",
  "Bases",
  "Cultures",
  "Flavorings",
  "Emulsifiers",
  "Preservatives",
  "Functional Ingredients",
];

const UNITS = ["kg", "g", "L", "mL", "units"];

const EditMaterialModal: React.FC<EditMaterialModalProps> = ({
  item,
  onClose,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useSettings();
  const updateItem = useMutation(api.inventory.update);
  const logActivity = useMutation(api.activities.log);

  const [activeTab, setActiveTab] = useState<"info" | "stock">("info");
  const [formData, setFormData] = useState({
    name: "",
    category: CATEGORIES[0],
    batchId: "",
    description: "",
    quantity: "",
    unit: "kg",
    price: "",
    lowStockThreshold: "",
    expiryDate: "",
    supplier: "",
    storageConditions: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill form when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        batchId: item.batchId,
        description: item.description ?? "",
        quantity: String(item.stock),
        unit: item.unit,
        price: item.price != null ? String(item.price) : "",
        lowStockThreshold:
          item.lowStockThreshold != null ? String(item.lowStockThreshold) : "",
        expiryDate: item.expiryDate ?? "",
        supplier: item.supplier ?? "",
        storageConditions: item.storageConditions ?? "",
      });
      setActiveTab("info");
      setError(null);
    }
  }, [item]);

  // ── Handlers ────────────────────────────────────────────
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = () => {
    if (!(formData.name && formData.batchId && formData.expiryDate)) {
      setError(t("please_fill_required_fields_material"));
      return false;
    }
    if (Number.parseFloat(formData.quantity) <= 0) {
      setError(t("quantity_greater_than_zero"));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "info") {
      nextTab();
      return;
    }

    if (!(validateForm() && item)) {
      return;
    }
    setIsSubmitting(true);

    const stockNum = Number.parseFloat(formData.quantity) || 0;
    const thresholdNum = Number.parseFloat(formData.lowStockThreshold) || 0;
    const priceNum = Number.parseFloat(formData.price) || 0;

    try {
      await updateItem({
        id: item._id,
        name: formData.name,
        description: formData.description || `Supplied by ${formData.supplier}`,
        category: formData.category,
        batchId: formData.batchId,
        stock: stockNum,
        unit: formData.unit,
        expiryDate: formData.expiryDate,
        price: priceNum,
        lowStockThreshold: thresholdNum,
        supplier: formData.supplier,
        storageConditions: formData.storageConditions,
      });
      logActivity({
        action: "Updated Inventory Item",
        target: formData.name,
        page: "Inventory",
      });
      onClose();
    } catch (err) {
      console.error("Failed to update material:", err);
      setError(t("failed_to_save_material"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextTab = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (activeTab === "info") {
      setActiveTab("stock");
    }
  };
  const prevTab = () => {
    if (activeTab === "stock") {
      setActiveTab("info");
    }
  };

  // ── Style tokens ────────────────────────────────────────
  const inputClasses =
    "w-full px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-[1rem] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 transition-all";
  const labelClasses =
    "block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ms-1";

  const modal = (
    <AnimatePresence>
      {!!item && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Backdrop */}
          <MotionDiv
            animate="visible"
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm dark:bg-black/60"
            exit="exit"
            initial="hidden"
            onClick={onClose}
            variants={overlayVariants}
          />

          {/* Modal Card */}
          <MotionDiv
            animate="visible"
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-[#1e293b]"
            exit="exit"
            initial="hidden"
            variants={modalVariants}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-gray-100 border-b bg-[#FAF5F0] p-8 dark:border-slate-700 dark:bg-[#1e293b]">
              <div
                className={`flex items-center ${isRTL ? "space-x-4 space-x-reverse" : "space-x-4"}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-indigo-600 text-white shadow-indigo-600/20 shadow-lg">
                  <Package size={24} />
                </div>
                <div>
                  <h2 className="font-bold text-2xl text-gray-900 leading-tight dark:text-white">
                    {t("editMaterial")}
                  </h2>
                  <p className="font-medium text-gray-500 text-sm dark:text-slate-400">
                    {t("editMaterialSubtitle")}
                  </p>
                </div>
              </div>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-8 pt-6">
              <div
                className={`flex items-center ${isRTL ? "space-x-1 space-x-reverse" : "space-x-1"} border-gray-200 border-b dark:border-slate-700`}
              >
                <button
                  className={`border-b-2 px-4 pb-3 font-bold text-sm uppercase tracking-wide transition-colors ${
                    activeTab === "info"
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                      : "border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                  }`}
                  onClick={() => setActiveTab("info")}
                  type="button"
                >
                  1. {t("materialInfo")}
                </button>
                <button
                  className={`border-b-2 px-4 pb-3 font-bold text-sm uppercase tracking-wide transition-colors ${
                    activeTab === "stock"
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                      : "border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                  }`}
                  onClick={() => setActiveTab("stock")}
                  type="button"
                >
                  2. {t("stockAndExpiry")}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
              <form
                className="space-y-6"
                id="edit-material-form"
                onSubmit={handleSubmit}
              >
                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                    <AlertTriangle className="mt-0.5 shrink-0" size={20} />
                    <p className="font-medium text-sm">{error}</p>
                  </div>
                )}

                {/* ── Tab 1: Material Info ─────────────────── */}
                {activeTab === "info" && (
                  <div className="fade-in slide-in-from-end-4 animate-in space-y-6 duration-300">
                    {/* Name & Category */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <label className={labelClasses}>
                          {t("materialName")}
                        </label>
                        <input
                          autoFocus
                          className={inputClasses}
                          name="name"
                          onChange={handleInputChange}
                          placeholder={t("example_xanthan_gum")}
                          required
                          value={formData.name}
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>
                          {t("category")}
                        </label>
                        <div className="relative">
                          <select
                            className={`${inputClasses} cursor-pointer appearance-none`}
                            name="category"
                            onChange={handleInputChange}
                            value={formData.category}
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {t(`category_${c.toLowerCase().replace(/ /g, "_")}`)}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg
                              fill="none"
                              height="12"
                              viewBox="0 0 12 12"
                              width="12"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M2.5 4.5L6 8L9.5 4.5"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Batch ID */}
                    <div>
                      <label className={labelClasses}>
                        {t("batchId")}
                      </label>
                      <input
                        className={`${inputClasses} font-mono`}
                        name="batchId"
                        onChange={handleInputChange}
                        placeholder={t("example_batch_id")}
                        required
                        value={formData.batchId}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className={labelClasses}>
                        {t("description")}
                      </label>
                      <textarea
                        className={`${inputClasses} resize-none`}
                        name="description"
                        onChange={handleInputChange}
                        placeholder={t("brief_description_raw_material")}
                        rows={3}
                        value={formData.description}
                      />
                    </div>
                  </div>
                )}

                {/* ── Tab 2: Stock & Expiry ────────────────── */}
                {activeTab === "stock" && (
                  <div className="fade-in slide-in-from-end-4 animate-in space-y-6 duration-300">
                    {/* Quantity & Unit */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <label className={labelClasses}>
                          {t("stockAmount")}
                        </label>
                        <input
                          className={inputClasses}
                          min="0"
                          name="quantity"
                          onChange={handleInputChange}
                          placeholder={t("placeholder_0")}
                          required
                          step="0.01"
                          type="number"
                          value={formData.quantity}
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>
                          {t("unit")}
                        </label>
                        <div className="relative">
                          <select
                            className={`${inputClasses} cursor-pointer appearance-none`}
                            name="unit"
                            onChange={handleInputChange}
                            value={formData.unit}
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg
                              fill="none"
                              height="12"
                              viewBox="0 0 12 12"
                              width="12"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M2.5 4.5L6 8L9.5 4.5"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price & Low-Stock Threshold */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <label className={labelClasses}>
                          {t("pricePerUnit")}
                        </label>
                        <input
                          className={inputClasses}
                          min="0"
                          name="price"
                          onChange={handleInputChange}
                          placeholder={t("example_12_50")}
                          step="any"
                          type="number"
                          value={formData.price}
                        />
                        <p className="ms-1 mt-1 text-gray-400 text-xs dark:text-slate-500">
                          {t("cost_per")} {formData.unit}
                        </p>
                      </div>
                      <div>
                        <label className={labelClasses}>
                          {t("lowStockThreshold")}
                        </label>
                        <input
                          className={inputClasses}
                          min="0"
                          name="lowStockThreshold"
                          onChange={handleInputChange}
                          placeholder={t("example_5")}
                          step="any"
                          type="number"
                          value={formData.lowStockThreshold}
                        />
                        <p className="ms-1 mt-1 text-gray-400 text-xs dark:text-slate-500">
                          {t("below_this_marked_as_low_stock")}
                        </p>
                      </div>
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <label className={labelClasses}>
                        {t("expiryDate")}
                      </label>
                      <div className="relative">
                        <input
                          className={inputClasses}
                          name="expiryDate"
                          onChange={handleInputChange}
                          required
                          type="date"
                          value={formData.expiryDate}
                        />
                        <Calendar
                          className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                      </div>
                    </div>

                    {/* Supplier & Storage */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <label className={labelClasses}>
                          {t("supplier_name")}
                        </label>
                        <div className="relative">
                          <input
                            className={inputClasses}
                            name="supplier"
                            onChange={handleInputChange}
                            placeholder={t("example_supplier")}
                            value={formData.supplier}
                          />
                          <Truck
                            className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClasses}>
                          {t("storage_conditions")}
                        </label>
                        <div className="relative">
                          <input
                            className={inputClasses}
                            name="storageConditions"
                            onChange={handleInputChange}
                            placeholder={t("example_storage")}
                            value={formData.storageConditions}
                          />
                          <Thermometer
                            className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live stock-status preview */}
                    {formData.quantity && formData.lowStockThreshold && (
                      <div
                        className={`rounded-[1.5rem] border p-4 ${
                          Number.parseFloat(formData.quantity) <
                          Number.parseFloat(formData.lowStockThreshold)
                            ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-900/20"
                            : "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-900/20"
                        } transition-colors`}
                      >
                        <p
                          className={`flex items-center gap-1.5 font-bold text-sm ${
                            Number.parseFloat(formData.quantity) <
                            Number.parseFloat(formData.lowStockThreshold)
                              ? "text-red-700 dark:text-red-300"
                              : "text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {Number.parseFloat(formData.quantity) <
                          Number.parseFloat(formData.lowStockThreshold) ? (
                            <>
                              <AlertTriangle size={16} />

                              {t("stock_will_be_marked_as_low")}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={16} />

                              {t("stock_level_is_ok")}
                            </>
                          )}
                        </p>
                        <p
                          className={`mt-1 text-xs ${
                            Number.parseFloat(formData.quantity) <
                            Number.parseFloat(formData.lowStockThreshold)
                              ? "text-red-600/70 dark:text-red-400/70"
                              : "text-emerald-600/70 dark:text-emerald-400/70"
                          }`}
                        >
                          {formData.quantity} {formData.unit} {t("threshold")}{" "}
                          {formData.lowStockThreshold} {formData.unit}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="mt-auto flex items-center justify-between border-gray-100 border-t bg-gray-50 px-8 py-6 dark:border-slate-700 dark:bg-slate-800/50">
              <button
                className={`flex items-center rounded-[1.2rem] px-6 py-3 font-bold text-gray-500 text-sm transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:text-slate-200 ${activeTab === "info" ? "invisible" : ""}`}
                disabled={activeTab === "info"}
                onClick={prevTab}
                type="button"
              >
                <ChevronLeft
                  className={isRTL ? "ms-1 -scale-x-100 transform" : "me-1"}
                  size={16}
                />
                {t("previous")}
              </button>

              <div className="flex items-center gap-4">
                <button
                  className="rounded-[1.2rem] px-6 py-3 font-bold text-gray-500 text-sm transition-colors hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={onClose}
                  type="button"
                >
                  {t("cancel")}
                </button>

                {activeTab !== "stock" ? (
                  <button
                    className="flex items-center gap-2 rounded-[1.2rem] bg-gray-900 px-8 py-3 font-bold text-sm text-white shadow-gray-900/20 shadow-lg transition-all hover:bg-gray-800 active:scale-95 dark:bg-indigo-600 dark:shadow-indigo-600/20 dark:hover:bg-indigo-500"
                    onClick={nextTab}
                    type="button"
                  >
                    {t("nextStep")}
                    <ChevronRight
                      className={isRTL ? "me-1 -scale-x-100 transform" : "ms-1"}
                      size={16}
                    />
                  </button>
                ) : (
                  <button
                    className="flex items-center gap-2 rounded-[1.2rem] bg-gray-900 px-8 py-3 font-bold text-sm text-white shadow-gray-900/20 shadow-lg transition-all hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-600 dark:shadow-indigo-600/20 dark:hover:bg-indigo-500"
                    disabled={isSubmitting}
                    form="edit-material-form"
                    type="submit"
                  >
                    {isSubmitting ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <Save size={18} />
                        {t("saveChanges")}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
};

export default EditMaterialModal;
