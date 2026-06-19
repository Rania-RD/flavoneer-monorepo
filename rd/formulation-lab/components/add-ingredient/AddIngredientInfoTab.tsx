import type { TFunction } from "i18next";
import { FlaskConical, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { normalizeInsNumber } from "../../convex/regulatoryHelpers";
import type { IngredientListItem } from "../../types";
import { Switch } from "../ui/Switch";
import type {
  ConversionDraft,
  IngredientFormData,
  SubIngredientDraft,
} from "./types";

interface AddIngredientInfoTabProps {
  additiveMatch: { name?: string } | null | undefined;
  allIngredients: IngredientListItem[];
  conversions: ConversionDraft[];
  coverImagePreview: string | null;
  existingCoverImageUrl: string | null;
  formData: IngredientFormData;
  handleAddConversion: () => void;
  handleAddSubIngredient: () => void;
  handleBlur: (field: string) => void;
  handleConversionChange: (id: string, field: string, value: string) => void;
  handleInputChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  handleRemoveConversion: (id: string) => void;
  handleRemoveSubIngredient: (id: string) => void;
  handleSubIngredientChange: (id: string, field: string, value: string) => void;
  inputClasses: string;
  insNumber: string;
  isAdditive: boolean;
  isComposite: boolean;
  labelClasses: string;
  markDirty: () => void;
  setCoverImageFile: (file: File | null) => void;
  setCoverImagePreview: (preview: string | null) => void;
  setInsNumber: (value: string) => void;
  setIsAdditive: (value: boolean) => void;
  setIsComposite: (value: boolean) => void;
  subIngredients: SubIngredientDraft[];
  t: TFunction;
  totalSubPercentage: number;
  touchedFields: Record<string, boolean>;
}

export function AddIngredientInfoTab({
  additiveMatch,
  allIngredients,
  conversions,
  coverImagePreview,
  existingCoverImageUrl,
  formData,
  handleAddConversion,
  handleAddSubIngredient,
  handleConversionChange,
  handleInputChange,
  handleRemoveConversion,
  handleRemoveSubIngredient,
  handleSubIngredientChange,
  inputClasses,
  insNumber,
  isAdditive,
  isComposite,
  labelClasses,
  markDirty,
  setCoverImageFile,
  setCoverImagePreview,
  setInsNumber,
  setIsAdditive,
  setIsComposite,
  subIngredients,
  t,
  totalSubPercentage,
  touchedFields,
  handleBlur,
}: AddIngredientInfoTabProps) {
  return (
    <div className="fade-in slide-in-from-end-4 animate-in space-y-6 duration-300">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className={labelClasses}>
            {t("name_en")} <span className="text-red-500">*</span>
          </label>
          <input
            autoFocus
            className={`${inputClasses} ${touchedFields.name && !formData.name.trim() ? "border-red-300 bg-red-50 focus:ring-red-500/50" : ""}`}
            name="name"
            onBlur={() => handleBlur("name")}
            onChange={handleInputChange}
            required
            value={formData.name}
          />
          {touchedFields.name && !formData.name.trim() && (
            <p className="mt-1 text-red-500 text-xs">{t("field_required")}</p>
          )}
        </div>
        <div>
          <label className={labelClasses}>
            {t("name_ar")} <span className="text-red-500">*</span>
          </label>
          <input
            className={`${inputClasses} ${touchedFields.nameAr && !formData.nameAr.trim() ? "border-red-300 bg-red-50 focus:ring-red-500/50" : ""}`}
            dir="rtl"
            name="nameAr"
            onBlur={() => handleBlur("nameAr")}
            onChange={handleInputChange}
            required
            value={formData.nameAr}
          />
          {touchedFields.nameAr && !formData.nameAr.trim() && (
            <p className="mt-1 text-red-500 text-xs">{t("field_required")}</p>
          )}
        </div>
        <div>
          <label className={labelClasses}>{t("common_name")}</label>
          <input
            className={inputClasses}
            name="commonName"
            onChange={handleInputChange}
            value={formData.commonName}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className={labelClasses}>
            {t("ingredient_code")} <span className="text-red-500">*</span>
          </label>
          <input
            className={`${inputClasses} font-mono ${touchedFields.code && !formData.code.trim() ? "border-red-300 bg-red-50 focus:ring-red-500/50" : ""}`}
            name="code"
            onBlur={() => handleBlur("code")}
            onChange={handleInputChange}
            required
            value={formData.code}
          />
          {touchedFields.code && !formData.code.trim() && (
            <p className="mt-1 text-red-500 text-xs">{t("field_required")}</p>
          )}
        </div>
        <div>
          <label className={labelClasses}>
            {t("ingredient_group")} <span className="text-red-500">*</span>
          </label>
          <select
            className={`${inputClasses} ${touchedFields.groupId && !formData.groupId.trim() ? "border-red-300 bg-red-50 focus:ring-red-500/50" : ""}`}
            name="groupId"
            onBlur={() => handleBlur("groupId")}
            onChange={handleInputChange}
            required
            value={formData.groupId}
          >
            <option value="group_other">{t("group_other")}</option>
            <option value="group_water_liquids">
              {t("group_water_liquids")}
            </option>
            <option value="group_dairy_eggs">{t("group_dairy_eggs")}</option>
            <option value="group_grains_baked">
              {t("group_grains_baked")}
            </option>
            <option value="group_proteins_meats">
              {t("group_proteins_meats")}
            </option>
            <option value="group_fruits_vegetables">
              {t("group_fruits_vegetables")}
            </option>
            <option value="group_fats_oils">{t("group_fats_oils")}</option>
            <option value="group_sugars_sweeteners">
              {t("group_sugars_sweeteners")}
            </option>
            <option value="group_spices_seasonings">
              {t("group_spices_seasonings")}
            </option>
            <option value="group_functional_additives">
              {t("group_functional_additives")}
            </option>
          </select>
        </div>
      </div>

      <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-800/30 dark:bg-indigo-900/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900 text-lg dark:text-white">
              {t("additive_metadata")}
            </h3>
            <p className="mt-1 text-gray-500 text-xs dark:text-slate-400">
              {t("additive_metadata_hint")}
            </p>
          </div>
          <Switch
            checked={isAdditive}
            onChange={(val) => {
              setIsAdditive(val);
              if (!val) {
                setInsNumber("");
              }
              markDirty();
            }}
          />
        </div>

        {isAdditive && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClasses}>{t("ins_number")}</label>
              <input
                className={inputClasses}
                dir="ltr"
                onBlur={() => setInsNumber(normalizeInsNumber(insNumber))}
                onChange={(event) => {
                  setInsNumber(event.target.value);
                  markDirty();
                }}
                placeholder={t("ins_number_placeholder")}
                value={insNumber}
              />
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-2xl border border-white/70 bg-white/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/70">
                <span className="block font-bold text-gray-500 text-xs uppercase tracking-wider dark:text-slate-400">
                  {t("catalog_match")}
                </span>
                <span className="mt-1 block font-semibold text-gray-900 dark:text-white">
                  {normalizeInsNumber(insNumber)
                    ? additiveMatch
                      ? additiveMatch.name
                      : t("no_catalog_match")
                    : t("enter_ins_number")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-gray-100 border-t pt-6 dark:border-slate-700" />
      <div className="space-y-4">
        <h3 className="font-bold text-gray-900 text-lg dark:text-white">
          {t("cover_image")}
        </h3>
        <div className="flex items-center gap-4">
          {coverImagePreview || existingCoverImageUrl ? (
            <img
              alt={t("cover_preview")}
              className="h-20 w-20 rounded-xl border border-gray-200 object-cover dark:border-slate-600"
              src={coverImagePreview || existingCoverImageUrl || ""}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-600 dark:bg-slate-700/50">
              <ImageIcon size={24} />
            </div>
          )}
          <div className="flex-1">
            <label className={labelClasses}>{t("upload_image")}</label>
            <input
              accept="image/png, image/jpeg, image/jpg"
              className="w-full text-gray-500 text-sm transition-all file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-semibold file:text-indigo-700 file:text-sm hover:file:bg-indigo-100 dark:text-slate-400 dark:file:bg-indigo-500/20 dark:file:text-indigo-300"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setCoverImageFile(file);
                  setCoverImagePreview(URL.createObjectURL(file));
                }
              }}
              type="file"
            />
            <p className="mt-1 text-gray-400 text-xs dark:text-slate-500">
              {t("jpg_or_png_up_to_5mb")}
            </p>
          </div>
        </div>
      </div>

      <div className="border-gray-100 border-t pt-6 dark:border-slate-700" />
      <div className="space-y-4">
        <h3 className="font-bold text-gray-900 text-lg dark:text-white">
          {t("labeling_data")}
        </h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className={labelClasses}>{t("isn_ar")}</label>
            <input
              className={inputClasses}
              dir="auto"
              name="isnAr"
              onChange={handleInputChange}
              value={formData.isnAr}
            />
          </div>
          <div>
            <label className={labelClasses}>{t("isn_en")}</label>
            <input
              className={inputClasses}
              dir="auto"
              name="isnEn"
              onChange={handleInputChange}
              value={formData.isnEn}
            />
          </div>
        </div>
        <p className="flex flex-row items-center gap-2 text-gray-500 text-xs dark:text-slate-400">
          <FlaskConical className="text-indigo-400" size={14} />
          {t("isn_hint")}
        </p>
      </div>

      <div className="border-gray-100 border-t pt-6 dark:border-slate-700" />
      <h3 className="font-bold text-gray-900 text-lg dark:text-white">
        {t("manufacturing")}
      </h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <label className={labelClasses}>{t("cost_per_kg_usd")}</label>
          <input
            className={inputClasses}
            min="0"
            name="costPerKg"
            onChange={handleInputChange}
            step="any"
            type="number"
            value={formData.costPerKg}
          />
        </div>
        <div>
          <label className={labelClasses}>{t("yield_percentage")}</label>
          <input
            className={inputClasses}
            name="yieldAmount"
            onChange={handleInputChange}
            step="any"
            type="number"
            value={formData.yieldAmount}
          />
        </div>
        <div>
          <label className={labelClasses}>
            {t("moisture_loss_percentage")}
          </label>
          <input
            className={inputClasses}
            name="moistureLoss"
            onChange={handleInputChange}
            step="any"
            type="number"
            value={formData.moistureLoss}
          />
        </div>
      </div>

      <div className="border-gray-100 border-t pt-6 dark:border-slate-700" />
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-lg dark:text-white">
          {t("conversions_and_measurements")}
        </h3>
        <button
          className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 font-bold text-indigo-600 text-sm transition hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30"
          onClick={handleAddConversion}
          type="button"
        >
          <Plus size={16} /> {t("add_conversion")}
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-end justify-between">
          <label className={labelClasses}>
            {t("density_specific_gravity")}
          </label>
          <span className="me-2 text-gray-400 text-xs dark:text-slate-500">
            {t("density_desc")}
          </span>
        </div>
        <input
          className={inputClasses}
          min="0.01"
          name="density"
          onChange={handleInputChange}
          step="0.01"
          type="number"
          value={formData.density}
        />
      </div>

      {conversions.length > 0 && (
        <div className="mt-4 space-y-3">
          {conversions.map((c) => (
            <div className="flex items-center gap-3" key={c.id}>
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4">
                  <span className="font-bold text-gray-500">1</span>
                </div>
                <input
                  className={`${inputClasses} ps-10`}
                  onChange={(e) =>
                    handleConversionChange(c.id, "unit", e.target.value)
                  }
                  placeholder={t("conversion_unit")}
                  value={c.unit}
                />
              </div>
              <div className="font-bold text-gray-400">
                {t("conversion_equals")}
              </div>
              <div className="relative w-32 text-end">
                <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-4">
                  <span className="font-bold text-gray-500">g</span>
                </div>
                <input
                  className={`${inputClasses} pe-10 text-end`}
                  min="0.01"
                  onChange={(e) =>
                    handleConversionChange(c.id, "grams", e.target.value)
                  }
                  placeholder={t("conversion_grams")}
                  step="any"
                  type="number"
                  value={c.grams}
                />
              </div>
              <button
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-red-50 text-red-500 transition hover:bg-red-100 dark:bg-red-500/20 dark:hover:bg-red-500/30"
                onClick={() => handleRemoveConversion(c.id)}
                type="button"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 border-gray-100 border-t pt-6 dark:border-slate-700" />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg dark:text-white">
            {t("is_composite")}
          </h3>
        </div>
        <Switch
          checked={isComposite}
          onChange={(val) => {
            setIsComposite(val);
            markDirty();
          }}
        />
      </div>

      {isComposite && (
        <div className="mt-4 space-y-4 rounded-3xl bg-gray-50 p-6 dark:bg-slate-800/50">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-bold text-gray-900 dark:text-white">
              {t("sub_ingredients")}
            </h4>
            <button
              className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1.5 font-bold text-indigo-600 text-sm transition hover:bg-indigo-200 dark:bg-indigo-500/30 dark:text-indigo-300"
              onClick={handleAddSubIngredient}
              type="button"
            >
              <Plus size={16} /> {t("add_sub_ingredient")}
            </button>
          </div>

          {subIngredients.length > 0 && (
            <div className="space-y-3">
              {subIngredients.map((s) => (
                <div className="flex items-center gap-3" key={s.id}>
                  <div className="flex-1">
                    <select
                      className={`${inputClasses} cursor-pointer`}
                      onChange={(e) =>
                        handleSubIngredientChange(
                          s.id,
                          "ingredientId",
                          e.target.value
                        )
                      }
                      value={s.ingredientId}
                    >
                      <option disabled value="">
                        {t("search_ingredients")}
                      </option>
                      {allIngredients.map((i) => (
                        <option key={i._id} value={i._id}>
                          {i.name} {i.code ? `(${i.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative w-28 shrink-0">
                    <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-4">
                      <span className="font-bold text-gray-500">%</span>
                    </div>
                    <input
                      className={`${inputClasses} pe-8 text-end`}
                      max="100"
                      min="0"
                      onChange={(e) =>
                        handleSubIngredientChange(
                          s.id,
                          "percentage",
                          e.target.value
                        )
                      }
                      placeholder="0"
                      step="any"
                      type="number"
                      value={s.percentage}
                    />
                  </div>
                  <button
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-red-50 text-red-500 transition hover:bg-red-100 dark:bg-red-500/20 dark:hover:bg-red-500/30"
                    onClick={() => handleRemoveSubIngredient(s.id)}
                    type="button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-gray-200 border-t pt-4 dark:border-slate-700">
            <span className="font-bold text-gray-500 dark:text-slate-400">
              {t("total")}
            </span>
            {totalSubPercentage === 100 ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700 text-xs dark:bg-emerald-500/20 dark:text-emerald-400">
                {t("sum_complete")}
              </span>
            ) : totalSubPercentage > 100 ? (
              <span className="rounded-full bg-red-100 px-3 py-1 font-bold text-red-700 text-xs dark:bg-red-500/20 dark:text-red-400">
                {t("sum_exceeds")} ({totalSubPercentage}%)
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-700 text-xs dark:bg-amber-500/20 dark:text-amber-400">
                {t("sum_incomplete")} ({totalSubPercentage}%)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
