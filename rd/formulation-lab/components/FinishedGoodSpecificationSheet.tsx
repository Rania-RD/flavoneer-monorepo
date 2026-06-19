import { Check, FileText, Printer, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  calculateNutritionFacts,
  getFormulationBaselineAllergens,
} from "../lib/formulation/helpers";
import {
  calculatePackagingCosts,
  calculateRecipeCosts,
  calculateRecipeMeasures,
} from "../lib/formulation/save-payload";
import type {
  AggregatedIngredient,
  EnrichedLabReport,
  EnrichedProject,
  Ingredient,
  TestResult,
} from "../types";

const TREE_NUT_ALLERGENS = [
  "allergen_almonds",
  "allergen_brazil_nuts",
  "allergen_cashews",
  "allergen_hazelnuts",
  "allergen_macadamia",
  "allergen_pecans",
  "allergen_pine_nuts",
  "allergen_pistachios",
  "allergen_walnuts",
];
const ALLERGEN_PREFIX_REGEX = /^allergen_/i;
const UNDERSCORE_REGEX = /_/g;
const TITLE_CASE_WORD_REGEX = /\b\w/g;

interface FinishedGoodSpecificationSheetProps {
  activeFormulation?: EnrichedProject | null;
  activeReport?: EnrichedLabReport;
  aggregatedIngredients: AggregatedIngredient[];
  isLoading?: boolean;
  onPrint: () => void;
  onSelectReport: (reportId: string) => void;
  reports: EnrichedLabReport[];
  selectedReportId?: string;
}

function formatDate(value?: number | string) {
  const date =
    typeof value === "number" || typeof value === "string"
      ? new Date(value)
      : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString();
  }
  return date.toLocaleDateString();
}

function formatNumber(value: number, digits = 1) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatMoney(value: number) {
  return `$${formatNumber(value, 2)}`;
}

function formatPercent(value: number) {
  return `${formatNumber(value, 2)}%`;
}

function normalizeLabel(value: string) {
  return value
    .replace(ALLERGEN_PREFIX_REGEX, "")
    .replace(UNDERSCORE_REGEX, " ")
    .replace(TITLE_CASE_WORD_REGEX, (letter) => letter.toUpperCase());
}

function findResult(results: TestResult[], terms: string[]) {
  return results.find((result) => {
    const label = result.parameter.toLowerCase();
    return terms.some((term) => label.includes(term));
  });
}

function formatResultValue(result?: TestResult, fallback = "TBD") {
  if (!result) {
    return fallback;
  }
  const value = Number.isFinite(result.actualValue)
    ? formatNumber(result.actualValue, 2)
    : String(result.actualValue);
  return `${value}${result.unit ? ` ${result.unit}` : ""}`;
}

function formatResultRange(result?: TestResult, fallback = "To be validated") {
  if (!result) {
    return fallback;
  }
  if (result.targetRange) {
    return result.targetRange;
  }
  return `${result.min}-${result.max}${result.unit ? ` ${result.unit}` : ""}`;
}

function attachLiveIngredientData(
  ingredients: Ingredient[],
  aggregatedIngredients: AggregatedIngredient[]
) {
  return ingredients.map((ingredient) => {
    const liveIngredient = aggregatedIngredients.find(
      (item) => item._id === ingredient.id
    );
    return {
      ...ingredient,
      costPerKg: ingredient.costPerKg ?? liveIngredient?.costPerKg,
      nutritionPer100g:
        ingredient.nutritionPer100g ?? liveIngredient?.nutritionPer100g,
    };
  });
}

function hasAnyAllergen(allergens: string[], terms: string[]) {
  const normalizedAllergens = allergens.map((allergen) =>
    allergen.toLowerCase()
  );
  return normalizedAllergens.some((allergen) =>
    terms.some((term) => allergen.includes(term))
  );
}

export default function FinishedGoodSpecificationSheet({
  activeFormulation,
  activeReport,
  aggregatedIngredients,
  isLoading,
  onPrint,
  onSelectReport,
  reports,
  selectedReportId,
}: FinishedGoodSpecificationSheetProps) {
  const { t } = useTranslation();
  const liveIngredients = useMemo(
    () =>
      attachLiveIngredientData(
        activeFormulation?.ingredients ?? [],
        aggregatedIngredients
      ),
    [activeFormulation?.ingredients, aggregatedIngredients]
  );

  const batchWeight = useMemo(
    () =>
      activeFormulation?.batchWeight ??
      liveIngredients.reduce(
        (total, ingredient) => total + ingredient.weight,
        0
      ),
    [activeFormulation?.batchWeight, liveIngredients]
  );
  const measures = calculateRecipeMeasures(
    batchWeight,
    activeFormulation?.servingSizeMode,
    activeFormulation?.servingSizeAmount ?? activeFormulation?.yield
  );
  const recipeCosts = calculateRecipeCosts(
    liveIngredients,
    measures.servingCount
  );
  const packagingCosts = calculatePackagingCosts({
    costPerServing: recipeCosts.costPerServing,
    packagingUnitPrice: activeFormulation?.packagingUnitPrice,
  });
  const nutritionFacts = calculateNutritionFacts(
    liveIngredients,
    measures.servingSizeWeight,
    batchWeight
  );
  const baselineAllergens = getFormulationBaselineAllergens(
    liveIngredients,
    aggregatedIngredients,
    TREE_NUT_ALLERGENS
  );
  const selectedAllergens =
    (activeFormulation?.formulationAllergens?.length ?? 0)
      ? (activeFormulation?.formulationAllergens ?? [])
      : baselineAllergens;
  const allergenText =
    selectedAllergens.length > 0
      ? selectedAllergens.map(normalizeLabel).join(", ")
      : t("no_declared_allergens");
  const ingredientStatement =
    liveIngredients.length > 0
      ? liveIngredients.map((ingredient) => ingredient.name).join(", ")
      : t("no_ingredients_selected");

  const typedFormulation = activeFormulation as
    | (EnrichedProject & {
        color?: string;
        gmoFree?: boolean;
        legalName?: string;
        packageContent?: string;
        storageConditions?: string;
        targetShelfLife?: string;
        viscosity?: string;
      })
    | null
    | undefined;

  const pHResult = findResult(activeReport?.results ?? [], ["ph"]);
  const brixResult = findResult(activeReport?.results ?? [], ["brix", "solid"]);
  const fatResult = findResult(activeReport?.results ?? [], ["fat"]);
  const viscosityResult = findResult(activeReport?.results ?? [], [
    "viscosity",
  ]);
  const colorResult = findResult(activeReport?.results ?? [], ["color"]);
  const yeastResult = findResult(activeReport?.results ?? [], ["yeast"]);
  const moldResult = findResult(activeReport?.results ?? [], ["mold"]);
  const tpcResult = findResult(activeReport?.results ?? [], [
    "plate",
    "aerobic",
    "tpc",
  ]);
  const coliformResult = findResult(activeReport?.results ?? [], ["coliform"]);

  const legalName =
    typedFormulation?.legalName ||
    activeFormulation?.productType ||
    activeFormulation?.name ||
    t("unassigned_product");
  const versionTag = activeFormulation?.version || "V1";
  const docCode = `FG-SPEC-${(
    activeFormulation?.formattedId ||
    activeFormulation?._id ||
    "DRAFT"
  )
    .slice(-8)
    .toUpperCase()}`;
  const shelfLife =
    typedFormulation?.targetShelfLife ||
    activeFormulation?.targetOutcome ||
    t("validate_by_shelf_life_study");
  const storageConditions =
    typedFormulation?.storageConditions ||
    (activeFormulation?.formulationState === "Solid"
      ? t("cool_dry_storage")
      : t("controlled_storage_per_validation"));
  const netWeight =
    typeof activeFormulation?.packagingCapacity === "number"
      ? `${formatNumber(activeFormulation.packagingCapacity, 1)} ${
          activeFormulation.packagingCapacityUnit || "g"
        }`
      : `${formatNumber(measures.servingSizeWeight, 1)} g`;
  const packageContent =
    typedFormulation?.packageContent ||
    activeFormulation?.packagingItemName ||
    t("packaging_method_not_selected");

  const claims = [
    {
      checked: !hasAnyAllergen(selectedAllergens, ["soy"]),
      label: t("soy_free"),
    },
    {
      checked: !hasAnyAllergen(selectedAllergens, ["milk", "dairy"]),
      label: t("dairy_free"),
    },
    {
      checked: !hasAnyAllergen(selectedAllergens, ["gluten", "wheat"]),
      label: t("gluten_free"),
    },
    {
      checked: Boolean(typedFormulation?.gmoFree),
      label: t("gmo_free"),
    },
  ];

  const productBullets = [
    `${t("category")}: ${activeFormulation?.category || t("unclassified")}`,
    `${t("formulation_state")}: ${
      activeFormulation?.formulationState
        ? t(activeFormulation.formulationState === "Solid" ? "solid" : "liquid")
        : t("liquid")
    }`,
    `${t("batch_weight")}: ${formatNumber(batchWeight, 1)} g`,
    `${t("finished_good_unit_cost")}: ${formatMoney(
      packagingCosts.finishedGoodCostPerUnit
    )}`,
  ];

  return (
    <>
      <section
        className="enterprise-panel p-4 sm:p-5"
        id="finished-good-spec-sheet"
      >
        <div className="spec-no-print mb-5 flex flex-col gap-3 border-slate-200 border-b pb-5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
          <div>
            <p className="font-semibold text-sky-700 text-xs uppercase tracking-[0.18em] dark:text-sky-300">
              {t("finished_good_specification_sheet")}
            </p>
            <h2 className="mt-1 font-semibold text-2xl text-slate-950 dark:text-white">
              {t("food_product_specification_sheet")}
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="enterprise-input min-w-[260px]"
              onChange={(event) => onSelectReport(event.target.value)}
              value={selectedReportId || ""}
            >
              {reports.map((report) => (
                <option key={report._id} value={report._id}>
                  {report.projectName} - {report.lotNumber}
                </option>
              ))}
            </select>
            <button
              className="enterprise-button-primary"
              onClick={onPrint}
              type="button"
            >
              <Printer size={16} />
              {t("print_a4_pdf")}
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="border border-slate-300 border-dashed p-6 text-center font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t("loading_active_formulation_data")}
          </div>
        )}

        {!(isLoading || (activeFormulation && activeReport)) && (
          <div className="border border-slate-300 border-dashed p-6 text-center font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t("select_report_for_finished_good_spec")}
          </div>
        )}

        {!isLoading && activeFormulation && activeReport && (
          <div className="space-y-5 text-slate-900 dark:text-slate-100 print:space-y-3">
            <header className="spec-print-avoid grid gap-4 border border-slate-300 bg-slate-50 p-4 lg:grid-cols-[1.2fr_1fr] dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-sky-700 font-semibold text-lg text-white">
                  FG
                </div>
                <div>
                  <p className="font-semibold text-sky-700 text-xs uppercase tracking-[0.16em] dark:text-sky-300">
                    {t("document_control")}
                  </p>
                  <h3 className="mt-2 font-semibold text-2xl text-slate-950 leading-tight dark:text-white">
                    {activeFormulation.name}
                  </h3>
                  <p className="mt-1 font-semibold text-slate-500 text-sm dark:text-slate-400">
                    {t("official_controlled_specification")}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-[11px] text-slate-500 uppercase">
                    {t("doc_code")}
                  </p>
                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {docCode}
                  </p>
                </div>
                <div className="border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-[11px] text-slate-500 uppercase">
                    {t("effective_date")}
                  </p>
                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {formatDate(activeReport.date)}
                  </p>
                </div>
                <div className="border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-[11px] text-slate-500 uppercase">
                    {t("version_tag")}
                  </p>
                  <p className="mt-1 font-semibold text-sky-700 dark:text-sky-300">
                    {versionTag}
                  </p>
                </div>
                <div className="border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <p className="font-bold text-[11px] uppercase">
                    {t("regulation_status")}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 font-semibold">
                    <ShieldCheck size={16} />
                    {t("compliant")}
                  </p>
                </div>
              </div>
            </header>

            <section className="spec-print-avoid grid gap-3 border border-slate-300 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
              {[
                [t("legal_name"), legalName],
                [t("target_shelf_life"), shelfLife],
                [t("storage_conditions"), storageConditions],
                [t("net_weight"), netWeight],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="font-bold text-[11px] text-slate-500 uppercase tracking-wide">
                    {label}
                  </p>
                  <p className="mt-1 font-bold text-slate-950 text-sm dark:text-white">
                    {value}
                  </p>
                </div>
              ))}
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(300px,1fr)]">
              <main className="space-y-5">
                <section className="spec-print-avoid border border-slate-300 p-4 dark:border-slate-800">
                  <h4 className="font-semibold text-base text-slate-950 dark:text-white">
                    {t("product_description")}
                  </h4>
                  <ul className="mt-3 grid gap-2 text-sm">
                    {productBullets.map((bullet) => (
                      <li className="flex gap-2" key={bullet}>
                        <Check
                          className="mt-0.5 shrink-0 text-sky-700"
                          size={16}
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="spec-print-avoid border border-slate-300 p-4 dark:border-slate-800">
                  <h4 className="font-semibold text-base text-slate-950 dark:text-white">
                    {t("ingredient_statement")}
                  </h4>
                  <p className="mt-3 border border-slate-200 bg-slate-50 p-3 font-medium text-slate-700 text-sm leading-6 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    {ingredientStatement}
                  </p>
                </section>

                <section className="spec-print-avoid overflow-hidden border border-slate-300 dark:border-slate-800">
                  <div className="border-slate-200 border-b bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                    <h4 className="font-semibold text-base text-slate-950 dark:text-white">
                      {t("industrial_formulation_table")}
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="bg-white text-[11px] text-slate-500 uppercase dark:bg-slate-950">
                        <tr>
                          <th className="px-5 py-3">{t("ingredient_name")}</th>
                          <th className="px-5 py-3">
                            {t("inclusion_percent")}
                          </th>
                          <th className="px-5 py-3">
                            {t("ingredient_function")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {liveIngredients.map((ingredient) => {
                          const percentage =
                            ingredient.percentage ??
                            (batchWeight > 0
                              ? (ingredient.weight / batchWeight) * 100
                              : 0);
                          return (
                            <tr key={`${ingredient.id}-${ingredient.name}`}>
                              <td className="px-5 py-3 font-bold">
                                {ingredient.name}
                              </td>
                              <td className="px-5 py-3 font-mono">
                                {formatPercent(percentage)}
                              </td>
                              <td className="px-5 py-3 text-slate-500">
                                {t("assign_function_placeholder")}
                              </td>
                            </tr>
                          );
                        })}
                        {liveIngredients.length === 0 && (
                          <tr>
                            <td
                              className="px-5 py-6 text-center text-slate-500"
                              colSpan={3}
                            >
                              {t("no_formulation_ingredients_available")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="spec-print-avoid grid gap-4 md:grid-cols-2">
                  <div className="border border-slate-300 p-4 dark:border-slate-800">
                    <h4 className="font-semibold text-base text-slate-950 dark:text-white">
                      {t("physical_specifications")}
                    </h4>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-slate-500">
                          {t("viscosity")}
                        </span>
                        <span className="font-bold">
                          {formatResultValue(
                            viscosityResult,
                            typedFormulation?.viscosity || t("tbd")
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-slate-500">
                          {t("color")}
                        </span>
                        <span className="font-bold">
                          {formatResultValue(
                            colorResult,
                            typedFormulation?.color ||
                              activeFormulation.targetTexture ||
                              t("tbd")
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-slate-500">
                          {t("state")}
                        </span>
                        <span className="font-bold">
                          {activeFormulation.formulationState
                            ? t(
                                activeFormulation.formulationState === "Solid"
                                  ? "solid"
                                  : "liquid"
                              )
                            : t("liquid")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-300 p-4 dark:border-slate-800">
                    <h4 className="font-semibold text-base text-slate-950 dark:text-white">
                      {t("chemical_specifications")}
                    </h4>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-slate-500">
                          {t("target_ph_range")}
                        </span>
                        <span className="font-bold">
                          {formatResultRange(pHResult)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-slate-500">
                          {t("brix_solids")}
                        </span>
                        <span className="font-bold">
                          {formatResultValue(brixResult)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-slate-500">
                          {t("fat_content")}
                        </span>
                        <span className="font-bold">
                          {formatResultValue(fatResult)}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="spec-print-avoid overflow-hidden border border-slate-300 dark:border-slate-800">
                  <div className="border-slate-200 border-b bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                    <h4 className="font-semibold text-base text-slate-950 dark:text-white">
                      {t("nutritional_information")}
                    </h4>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {[
                        [
                          t("serving_size"),
                          `${formatNumber(measures.servingSizeWeight, 1)} g`,
                        ],
                        [t("calories"), `${nutritionFacts.calories} kcal`],
                        [
                          t("protein"),
                          `${formatNumber(nutritionFacts.protein)} g`,
                        ],
                        [
                          t("total_fat"),
                          `${formatNumber(nutritionFacts.fat)} g`,
                        ],
                        [
                          t("carbohydrates"),
                          `${formatNumber(nutritionFacts.carbohydrates)} g`,
                        ],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <td className="px-5 py-3 font-bold">{label}</td>
                          <td className="px-5 py-3 text-right font-mono">
                            {value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section className="spec-print-avoid border border-slate-300 p-4 dark:border-slate-800">
                  <h4 className="font-semibold text-base text-slate-950 dark:text-white">
                    {t("regulatory_claims_checklist")}
                  </h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {claims.map((claim) => (
                      <div
                        className="flex items-center gap-3 border border-slate-200 p-3 dark:border-slate-800"
                        key={claim.label}
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center border ${
                            claim.checked
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
                          }`}
                        >
                          {claim.checked && <Check size={14} />}
                        </span>
                        <span className="font-bold text-sm">{claim.label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </main>

              <aside className="space-y-3 border border-sky-200 bg-sky-50 p-4 text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-50">
                <div className="border border-sky-100 bg-white p-3 dark:border-sky-900/40 dark:bg-slate-950">
                  <p className="font-semibold text-sky-700 text-xs uppercase dark:text-sky-300">
                    {t("shelf_life")}
                  </p>
                  <p className="mt-2 font-semibold text-xl">{shelfLife}</p>
                </div>
                <div className="border border-sky-100 bg-white p-3 dark:border-sky-900/40 dark:bg-slate-950">
                  <p className="font-semibold text-sky-700 text-xs uppercase dark:text-sky-300">
                    {t("suggestive_storage")}
                  </p>
                  <p className="mt-2 font-bold text-lg">{storageConditions}</p>
                </div>
                <div className="border border-amber-200 bg-amber-50 p-3 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-semibold text-xs uppercase tracking-wide">
                    {t("allergens")}
                  </p>
                  <p className="mt-2 font-bold text-sm leading-6">
                    {allergenText}
                  </p>
                </div>
                <div className="border border-sky-100 bg-white p-3 dark:border-sky-900/40 dark:bg-slate-950">
                  <p className="font-semibold text-sky-700 text-xs uppercase dark:text-sky-300">
                    {t("package_content")}
                  </p>
                  <p className="mt-2 font-bold text-sm leading-6">
                    {packageContent}
                  </p>
                  <p className="mt-3 border border-slate-200 bg-slate-50 p-3 font-semibold text-slate-600 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    {t("total_finished_good_cost_per_unit")}{" "}
                    {formatMoney(packagingCosts.finishedGoodCostPerUnit)}
                  </p>
                </div>
                <div className="border border-sky-100 bg-white p-3 dark:border-sky-900/40 dark:bg-slate-950">
                  <p className="font-semibold text-sky-700 text-xs uppercase dark:text-sky-300">
                    {t("nutrition_facts")}
                  </p>
                  <div className="mt-3 border-2 border-black bg-white p-3 text-black">
                    <h5 className="border-black border-b-8 pb-1 font-black text-3xl leading-none">
                      {t("nutrition_facts")}
                    </h5>
                    <div className="border-black border-b py-1 font-bold text-sm">
                      {t("serving_size")}{" "}
                      {formatNumber(measures.servingSizeWeight, 1)}g
                    </div>
                    <div className="flex items-end justify-between border-black border-b-4 py-1">
                      <span className="font-black text-xl">
                        {t("calories")}
                      </span>
                      <span className="font-black text-3xl">
                        {nutritionFacts.calories}
                      </span>
                    </div>
                    {[
                      [t("total_fat"), `${formatNumber(nutritionFacts.fat)}g`],
                      [
                        t("total_carbohydrate"),
                        `${formatNumber(nutritionFacts.carbohydrates)}g`,
                      ],
                      [
                        t("protein"),
                        `${formatNumber(nutritionFacts.protein)}g`,
                      ],
                    ].map(([label, value]) => (
                      <div
                        className="flex justify-between border-black border-b py-1 font-bold text-sm"
                        key={label}
                      >
                        <span>{label}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border border-sky-100 bg-white p-3 dark:border-sky-900/40 dark:bg-slate-950">
                  <p className="font-semibold text-sky-700 text-xs uppercase dark:text-sky-300">
                    {t("microbiological_specification")}
                  </p>
                  <div className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                    {[
                      [t("total_plate_count"), tpcResult, "<= 1,000 CFU/g"],
                      [t("yeast"), yeastResult, "<= 100 CFU/g"],
                      [t("mold"), moldResult, "<= 100 CFU/g"],
                      [t("coliform"), coliformResult, t("absent_per_g")],
                    ].map(([label, result, limit]) => (
                      <div
                        className="grid grid-cols-[1fr_auto] gap-3 py-2"
                        key={label as string}
                      >
                        <span className="font-semibold">{label as string}</span>
                        <span className="text-right font-mono text-xs">
                          {result
                            ? formatResultValue(result as TestResult)
                            : (limit as string)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-sky-950 p-3 text-white">
                  <p className="font-semibold text-sky-200 text-xs uppercase">
                    {t("metadata_footer")}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-sky-200">{t("version_no")}</p>
                      <p className="font-semibold">{versionTag}</p>
                    </div>
                    <div>
                      <p className="text-sky-200">{t("issue_date")}</p>
                      <p className="font-semibold">
                        {formatDate(activeReport.date)}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            <section className="spec-print-avoid border border-slate-300 p-4 dark:border-slate-800">
              <h4 className="mb-4 flex items-center gap-2 font-semibold text-base text-slate-950 dark:text-white">
                <FileText size={18} />
                {t("signoff_authorization")}
              </h4>
              <div className="grid gap-5 md:grid-cols-3">
                {[
                  t("prepared_by_rd"),
                  t("reviewed_by_qa"),
                  t("approved_by_plant_manager"),
                ].map((label) => (
                  <div className="pt-8" key={label}>
                    <div className="border-slate-400 border-t pt-2">
                      <p className="font-bold text-slate-900 text-sm dark:text-slate-100">
                        {label}
                      </p>
                      <p className="mt-1 text-slate-500 text-xs">
                        {t("signature_date")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
    </>
  );
}
