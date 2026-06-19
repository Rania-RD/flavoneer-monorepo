import { Check, FileText, Printer, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
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
      : "No declared allergens";
  const ingredientStatement =
    liveIngredients.length > 0
      ? liveIngredients.map((ingredient) => ingredient.name).join(", ")
      : "No ingredients selected";

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
    "Unassigned product";
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
    "Validate by shelf-life study";
  const storageConditions =
    typedFormulation?.storageConditions ||
    (activeFormulation?.formulationState === "Solid"
      ? "Cool, dry storage"
      : "Controlled storage per validation");
  const netWeight =
    typeof activeFormulation?.packagingCapacity === "number"
      ? `${formatNumber(activeFormulation.packagingCapacity, 1)} ${
          activeFormulation.packagingCapacityUnit || "g"
        }`
      : `${formatNumber(measures.servingSizeWeight, 1)} g`;
  const packageContent =
    typedFormulation?.packageContent ||
    activeFormulation?.packagingItemName ||
    "Packaging method not selected";

  const claims = [
    {
      checked: !hasAnyAllergen(selectedAllergens, ["soy"]),
      label: "Soy Free",
    },
    {
      checked: !hasAnyAllergen(selectedAllergens, ["milk", "dairy"]),
      label: "Dairy Free",
    },
    {
      checked: !hasAnyAllergen(selectedAllergens, ["gluten", "wheat"]),
      label: "Gluten Free",
    },
    {
      checked: Boolean(typedFormulation?.gmoFree),
      label: "GMO Free",
    },
  ];

  const productBullets = [
    `Category: ${activeFormulation?.category || "Unclassified"}`,
    `Formulation state: ${activeFormulation?.formulationState || "Liquid"}`,
    `Batch weight: ${formatNumber(batchWeight, 1)} g`,
    `Finished good unit cost: ${formatMoney(
      packagingCosts.finishedGoodCostPerUnit
    )}`,
  ];

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body * {
            visibility: hidden;
          }

          #finished-good-spec-sheet,
          #finished-good-spec-sheet * {
            visibility: visible;
          }

          #finished-good-spec-sheet {
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            margin: 0 !important;
            box-shadow: none !important;
          }

          .spec-no-print {
            display: none !important;
          }

          .spec-print-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <section
        className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950"
        id="finished-good-spec-sheet"
      >
        <div className="spec-no-print mb-5 flex flex-col gap-3 border-slate-200 border-b pb-5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
          <div>
            <p className="font-bold text-blue-700 text-xs uppercase tracking-[0.22em] dark:text-blue-300">
              Finished Good Specification Sheet
            </p>
            <h2 className="mt-1 font-bold text-2xl text-slate-950 dark:text-white">
              Food Product Specification Sheet
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="min-w-[260px] rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900/40"
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-bold text-sm text-white transition hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
              onClick={onPrint}
              type="button"
            >
              <Printer size={16} />
              Print A4 PDF
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-slate-300 border-dashed p-8 text-center font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Loading active formulation data...
          </div>
        )}

        {!(isLoading || (activeFormulation && activeReport)) && (
          <div className="rounded-2xl border border-slate-300 border-dashed p-8 text-center font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Select a lab report with a linked formulation to generate the
            finished good specification sheet.
          </div>
        )}

        {!isLoading && activeFormulation && activeReport && (
          <div className="space-y-5 text-slate-900 dark:text-slate-100 print:space-y-3">
            <header className="spec-print-avoid grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:grid-cols-[1.2fr_1fr] dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-700 font-black text-white text-xl">
                  FG
                </div>
                <div>
                  <p className="font-bold text-blue-700 text-xs uppercase tracking-[0.2em] dark:text-blue-300">
                    Document Control
                  </p>
                  <h3 className="mt-2 font-black text-3xl text-slate-950 leading-tight dark:text-white">
                    {activeFormulation.name}
                  </h3>
                  <p className="mt-1 font-semibold text-slate-500 text-sm dark:text-slate-400">
                    Official controlled specification for manufacturing,
                    quality, and regulatory review.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-[11px] text-slate-500 uppercase">
                    Doc Code
                  </p>
                  <p className="mt-1 font-black text-slate-950 dark:text-white">
                    {docCode}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-[11px] text-slate-500 uppercase">
                    Effective Date
                  </p>
                  <p className="mt-1 font-black text-slate-950 dark:text-white">
                    {formatDate(activeReport.date)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-[11px] text-slate-500 uppercase">
                    Version Tag
                  </p>
                  <p className="mt-1 font-black text-blue-700 dark:text-blue-300">
                    {versionTag}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <p className="font-bold text-[11px] uppercase">
                    Regulation Status
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 font-black">
                    <ShieldCheck size={16} />
                    Compliant
                  </p>
                </div>
              </div>
            </header>

            <section className="spec-print-avoid grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
              {[
                ["Legal Name", legalName],
                ["Target Shelf Life", shelfLife],
                ["Storage Conditions", storageConditions],
                ["Net Weight", netWeight],
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
                <section className="spec-print-avoid rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <h4 className="font-black text-lg text-slate-950 dark:text-white">
                    Product Description
                  </h4>
                  <ul className="mt-3 grid gap-2 text-sm">
                    {productBullets.map((bullet) => (
                      <li className="flex gap-2" key={bullet}>
                        <Check
                          className="mt-0.5 shrink-0 text-blue-700"
                          size={16}
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="spec-print-avoid rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <h4 className="font-black text-lg text-slate-950 dark:text-white">
                    Ingredient Statement
                  </h4>
                  <p className="mt-3 rounded-xl bg-slate-50 p-4 font-semibold text-slate-700 text-sm leading-6 dark:bg-slate-900 dark:text-slate-200">
                    {ingredientStatement}
                  </p>
                </section>

                <section className="spec-print-avoid overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="border-slate-200 border-b bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                    <h4 className="font-black text-lg text-slate-950 dark:text-white">
                      Industrial Formulation Table
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="bg-white text-[11px] text-slate-500 uppercase dark:bg-slate-950">
                        <tr>
                          <th className="px-5 py-3">Ingredient Name</th>
                          <th className="px-5 py-3">Inclusion %</th>
                          <th className="px-5 py-3">Ingredient Function</th>
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
                                Placeholder - assign function
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
                              No formulation ingredients available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="spec-print-avoid grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                    <h4 className="font-black text-lg text-slate-950 dark:text-white">
                      Physical Specifications
                    </h4>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-slate-500">
                          Viscosity
                        </span>
                        <span className="font-bold">
                          {formatResultValue(
                            viscosityResult,
                            typedFormulation?.viscosity || "TBD"
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-slate-500">
                          Color
                        </span>
                        <span className="font-bold">
                          {formatResultValue(
                            colorResult,
                            typedFormulation?.color ||
                              activeFormulation.targetTexture ||
                              "TBD"
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-slate-500">
                          State
                        </span>
                        <span className="font-bold">
                          {activeFormulation.formulationState || "Liquid"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                    <h4 className="font-black text-lg text-slate-950 dark:text-white">
                      Chemical Specifications
                    </h4>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-slate-500">
                          Target pH range
                        </span>
                        <span className="font-bold">
                          {formatResultRange(pHResult)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-slate-500">
                          Brix / Solids
                        </span>
                        <span className="font-bold">
                          {formatResultValue(brixResult)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold text-slate-500">
                          Fat Content
                        </span>
                        <span className="font-bold">
                          {formatResultValue(fatResult)}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="spec-print-avoid overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="border-slate-200 border-b bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                    <h4 className="font-black text-lg text-slate-950 dark:text-white">
                      Nutritional Information
                    </h4>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {[
                        [
                          "Serving Size",
                          `${formatNumber(measures.servingSizeWeight, 1)} g`,
                        ],
                        ["Calories", `${nutritionFacts.calories} kcal`],
                        [
                          "Protein",
                          `${formatNumber(nutritionFacts.protein)} g`,
                        ],
                        ["Total Fat", `${formatNumber(nutritionFacts.fat)} g`],
                        [
                          "Carbohydrates",
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

                <section className="spec-print-avoid rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <h4 className="font-black text-lg text-slate-950 dark:text-white">
                    Regulatory Claims Checklist
                  </h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {claims.map((claim) => (
                      <div
                        className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                        key={claim.label}
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-md border ${
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

              <aside className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-50">
                <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950">
                  <p className="font-bold text-blue-700 text-xs uppercase dark:text-blue-300">
                    Shelf Life
                  </p>
                  <p className="mt-2 font-black text-2xl">{shelfLife}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950">
                  <p className="font-bold text-blue-700 text-xs uppercase dark:text-blue-300">
                    Suggestive Storage
                  </p>
                  <p className="mt-2 font-bold text-lg">{storageConditions}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-black text-xs uppercase tracking-wide">
                    Allergens
                  </p>
                  <p className="mt-2 font-bold text-sm leading-6">
                    {allergenText}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950">
                  <p className="font-bold text-blue-700 text-xs uppercase dark:text-blue-300">
                    Package Content
                  </p>
                  <p className="mt-2 font-bold text-sm leading-6">
                    {packageContent}
                  </p>
                  <p className="mt-3 rounded-xl bg-slate-50 p-3 font-semibold text-slate-600 text-xs dark:bg-slate-900 dark:text-slate-300">
                    Total finished good cost per unit:{" "}
                    {formatMoney(packagingCosts.finishedGoodCostPerUnit)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950">
                  <p className="font-bold text-blue-700 text-xs uppercase dark:text-blue-300">
                    Nutrition Facts
                  </p>
                  <div className="mt-3 border-2 border-black bg-white p-3 text-black">
                    <h5 className="border-black border-b-8 pb-1 font-black text-3xl leading-none">
                      Nutrition Facts
                    </h5>
                    <div className="border-black border-b py-1 font-bold text-sm">
                      Serving size {formatNumber(measures.servingSizeWeight, 1)}
                      g
                    </div>
                    <div className="flex items-end justify-between border-black border-b-4 py-1">
                      <span className="font-black text-xl">Calories</span>
                      <span className="font-black text-3xl">
                        {nutritionFacts.calories}
                      </span>
                    </div>
                    {[
                      ["Total Fat", `${formatNumber(nutritionFacts.fat)}g`],
                      [
                        "Total Carbohydrate",
                        `${formatNumber(nutritionFacts.carbohydrates)}g`,
                      ],
                      ["Protein", `${formatNumber(nutritionFacts.protein)}g`],
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
                <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950">
                  <p className="font-bold text-blue-700 text-xs uppercase dark:text-blue-300">
                    Microbiological Specification
                  </p>
                  <div className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                    {[
                      ["Total Plate Count", tpcResult, "<= 1,000 CFU/g"],
                      ["Yeast", yeastResult, "<= 100 CFU/g"],
                      ["Mold", moldResult, "<= 100 CFU/g"],
                      ["Coliform", coliformResult, "Absent / g"],
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
                <div className="rounded-2xl bg-blue-900 p-4 text-white shadow-sm">
                  <p className="font-bold text-blue-200 text-xs uppercase">
                    Metadata Footer
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-blue-200">Version No.</p>
                      <p className="font-black">{versionTag}</p>
                    </div>
                    <div>
                      <p className="text-blue-200">Issue Date</p>
                      <p className="font-black">
                        {formatDate(activeReport.date)}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            <section className="spec-print-avoid rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
              <h4 className="mb-4 flex items-center gap-2 font-black text-lg text-slate-950 dark:text-white">
                <FileText size={18} />
                Sign-off Authorization
              </h4>
              <div className="grid gap-5 md:grid-cols-3">
                {[
                  "Prepared by R&D",
                  "Reviewed by QA",
                  "Approved by Plant Manager",
                ].map((label) => (
                  <div className="pt-8" key={label}>
                    <div className="border-slate-400 border-t pt-2">
                      <p className="font-bold text-slate-900 text-sm dark:text-slate-100">
                        {label}
                      </p>
                      <p className="mt-1 text-slate-500 text-xs">
                        Signature / Date
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
