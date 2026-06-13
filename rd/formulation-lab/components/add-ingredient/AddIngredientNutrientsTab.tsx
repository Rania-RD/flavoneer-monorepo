import { Edit2, Plus, Trash2 } from "lucide-react";
import type { TFunction } from "i18next";
import { ALLERGEN_LISTS, PREDEFINED_NUTRIENTS, TREE_NUT_OPTIONS } from "./constants";
import { calculateDailyValue } from "./ingredientHelpers";
import type { AllergenRegion, NutrientDraft, NutritionLegislation } from "./types";

interface AddIngredientNutrientsTabProps {
  allergenRegion: AllergenRegion;
  allergenValues: string[];
  allergenVerified: boolean;
  computedNutrients: Record<string, number>;
  handleAddNutrient: () => void;
  handleNutrientChange: (id: string, field: string, value: string) => void;
  handleRemoveNutrient: (id: string) => void;
  inputClasses: string;
  isComposite: boolean;
  labelClasses: string;
  legislation: NutritionLegislation;
  markDirty: () => void;
  nutrientValues: NutrientDraft[];
  overriddenNutrients: Record<string, boolean>;
  setAllergenRegion: (region: AllergenRegion) => void;
  setAllergenVerified: (value: boolean) => void;
  setLegislation: (legislation: NutritionLegislation) => void;
  setOverriddenNutrients: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  subAllergens: Record<string, string[]>;
  t: TFunction;
  toast: { success: (message: string) => void };
  toggleAllergen: (allergenKey: string) => void;
  toggleSubAllergen: (parentKey: string, subKey: string) => void;
}

export function AddIngredientNutrientsTab({
  allergenRegion,
  allergenValues,
  allergenVerified,
  computedNutrients,
  handleAddNutrient,
  handleNutrientChange,
  handleRemoveNutrient,
  inputClasses,
  isComposite,
  labelClasses,
  legislation,
  markDirty,
  nutrientValues,
  overriddenNutrients,
  setAllergenRegion,
  setAllergenVerified,
  setLegislation,
  setOverriddenNutrients,
  subAllergens,
  t,
  toast,
  toggleAllergen,
  toggleSubAllergen,
}: AddIngredientNutrientsTabProps) {
  return (
<div className="fade-in slide-in-from-end-4 animate-in space-y-8 duration-300">
      {/* Nutrients */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg dark:text-white">
            {t("nutritional_data")}
          </h3>
          <button
            className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 font-bold text-indigo-600 text-sm transition hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30"
            onClick={handleAddNutrient}
            type="button"
          >
            <Plus size={16} /> {t("add_nutrient")}
          </button>
        </div>

        <div className="mb-4">
          <label className={labelClasses}>
            {t("legislation")}
          </label>
          <select
            className={`${inputClasses} w-full cursor-pointer md:w-1/2`}
            onChange={(e) =>
              setLegislation(
                e.target.value as "FDA" | "EU" | "SFDA"
              )
            }
            value={legislation}
          >
            <option value="FDA">{t("legislation_fda")}</option>
            <option value="EU">{t("legislation_eu")}</option>
            <option value="SFDA">{t("legislation_sfda")}</option>
          </select>
        </div>

        {nutrientValues.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 border-dashed py-8 text-center dark:border-slate-700">
            <p className="text-gray-500 text-sm dark:text-slate-400">
              {t("no_nutrients_added")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {nutrientValues.map((n) => (
              <div
                className="flex flex-wrap items-end gap-3 sm:flex-nowrap"
                key={n.id}
              >
                <div className="flex-1">
                  <label className={labelClasses}>
                    {t("select_nutrient")}
                  </label>
                  <select
                    className={`${inputClasses} cursor-pointer`}
                    onChange={(e) =>
                      handleNutrientChange(
                        n.id,
                        "predefinedId",
                        e.target.value
                      )
                    }
                    value={n.predefinedId}
                  >
                    <option disabled value="">
                      -
                    </option>
                    {PREDEFINED_NUTRIENTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {t(p.key)}
                      </option>
                    ))}
                  </select>
                </div>

                {n.predefinedId === "custom" && (
                  <div className="flex-1">
                    <label className={labelClasses}>
                      {t("custom_nutrient")}
                    </label>
                    <input
                      className={inputClasses}
                      onChange={(e) =>
                        handleNutrientChange(
                          n.id,
                          "customName",
                          e.target.value
                        )
                      }
                      value={n.customName}
                    />
                  </div>
                )}

                {(() => {
                  const isCustom = n.predefinedId === "custom";
                  const nutrientName = isCustom
                    ? n.customName
                    : t(n.predefinedId);
                  const computedVal = isComposite
                    ? computedNutrients[nutrientName]
                    : undefined;
                  const isOverridden = isComposite
                    ? overriddenNutrients[n.id]
                    : false;
                  const displayValue =
                    isComposite &&
                    computedVal !== undefined &&
                    !isOverridden
                      ? computedVal.toFixed(2)
                      : n.value;
                  const isDerived =
                    isComposite &&
                    computedVal !== undefined &&
                    !isOverridden;

                  return (
                    <div className="w-24 shrink-0">
                      <label className={labelClasses}>
                        {t("nutrient_value")}
                      </label>
                      <div className="relative">
                        <input
                          className={`${inputClasses} ${isDerived ? "border-indigo-100 bg-indigo-50/50 pe-8 font-bold text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400" : ""}`}
                          onChange={(e) => {
                            if (isDerived) {
                              setOverriddenNutrients((prev) => ({
                                ...prev,
                                [n.id]: true,
                              }));
                            }
                            handleNutrientChange(
                              n.id,
                              "value",
                              e.target.value
                            );
                          }}
                          readOnly={isDerived}
                          step="any"
                          type="number"
                          value={displayValue}
                        />
                        {isDerived && (
                          <button
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-400 transition hover:text-indigo-600"
                            onClick={() => {
                              setOverriddenNutrients((prev) => ({
                                ...prev,
                                [n.id]: true,
                              }));
                              handleNutrientChange(
                                n.id,
                                "value",
                                computedVal.toFixed(2)
                              );
                            }}
                            title={t("override_calculated_value")}
                            type="button"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="w-20 shrink-0">
                  <label className={labelClasses}>
                    {t("nutrient_unit")}
                  </label>
                  <input
                    className={`${inputClasses} px-1 text-center`}
                    onChange={(e) =>
                      handleNutrientChange(
                        n.id,
                        "unit",
                        e.target.value
                      )
                    }
                    value={n.unit}
                  />
                </div>

                <div className="w-24 shrink-0">
                  <label className={labelClasses}>
                    {t("reference_value")}
                  </label>
                  <div className="flex h-[46px] items-center justify-center rounded-[1rem] border border-transparent bg-indigo-50/50 font-bold text-indigo-700 text-sm dark:bg-indigo-900/20 dark:text-indigo-300">
                    {calculateDailyValue(
                      n.predefinedId,
                      n.value,
                      legislation
                    )}
                  </div>
                </div>

                <button
                  className="mb-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-red-50 text-red-500 transition hover:bg-red-100 dark:bg-red-500/20 dark:hover:bg-red-500/30"
                  onClick={() => handleRemoveNutrient(n.id)}
                  type="button"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-gray-100 border-t pt-2 dark:border-slate-700" />

      {/* Allergens */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg dark:text-white">
            {t("allergens")}
          </h3>
          {!allergenVerified ? (
             <span className="rounded-full bg-orange-100 px-3 py-1 font-bold text-orange-700 text-xs dark:bg-orange-500/20 dark:text-orange-300">
               {t("unverified")}
             </span>
          ) : (
             <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700 text-xs dark:bg-emerald-500/20 dark:text-emerald-400">
               {t("verified")}
             </span>
          )}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
           <div className="flex-1 max-w-xs">
              <label className={labelClasses}>{t("allergen_region")}</label>
              <select
                 className={inputClasses}
                 value={allergenRegion}
                 onChange={(e) => setAllergenRegion(e.target.value as "FDA" | "EU" | "GSO")}
              >
                 <option value="FDA">{t("fda_usa")}</option>
                 <option value="EU">{t("eu_europe")}</option>
                 <option value="GSO">{t("gso_gulf")}</option>
              </select>
           </div>
           <button
              type="button"
              onClick={() => {
                 setAllergenVerified(true);
                 markDirty();
                 toast.success(t("allergens_verified_success"));
              }}
              className="flex h-[46px] items-center justify-center rounded-[1rem] bg-indigo-50 px-6 font-bold text-indigo-600 text-sm transition hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400"
           >
              {t("verify_allergens")}
           </button>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 mt-4">
           {ALLERGEN_LISTS[allergenRegion].map((allergenKey) => (
             <div key={allergenKey} className="flex flex-col gap-2">
               <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 dark:text-slate-300">
                 <input 
                   type="checkbox" 
                   className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                   checked={allergenValues.includes(allergenKey)}
                   onChange={() => toggleAllergen(allergenKey)}
                 />
                 <span className="text-sm">{t(allergenKey)}</span>
               </label>
               {allergenKey === "allergen_tree_nuts" && allergenValues.includes(allergenKey) && (
                  <div className="ms-6 flex flex-col gap-2 border-s-2 border-indigo-100 ps-4 pt-2 dark:border-indigo-500/20">
                     {TREE_NUT_OPTIONS.map((subKey) => (
                       <label key={subKey} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-slate-400">
                         <input 
                           type="checkbox" 
                           className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                           checked={subAllergens[allergenKey]?.includes(subKey) || false}
                           onChange={() => toggleSubAllergen(allergenKey, subKey)}
                         />
                         {t(subKey)}
                       </label>
                     ))}
                  </div>
               )}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
