import { expect, test } from "@playwright/test";
import {
  buildCompletedRunPhases,
  buildIngredientsUsage,
} from "../hooks/run-execution/runPersistence";
import { getRunValidation } from "../hooks/run-execution/runValidation";
import {
  buildFormulationSavePayload,
  calculateProjectRDCost,
  calculatePackagingCosts,
  calculateRecipeCosts,
  calculateRecipeMeasures,
  isServingOverPackagingCapacity,
} from "../lib/formulation/save-payload";
import {
  addStepAfterStepInPhase,
  deletePhaseFromPhases,
  deleteStepFromPhase,
  reorderPhases,
  reorderStepInPhase,
  updatePhaseInPhases,
  updateStepInPhase,
} from "../lib/formulation/editing";
import {
  applyAllergenOverrides,
  buildAggregatedIngredients,
  calculateRegulationCompliance,
  calculateNutritionFacts,
  deriveIngredients,
  getFormulationBaselineAllergens,
} from "../lib/formulation/helpers";
import {
  findCompositeDependencies,
  findProjectIdsUsingIngredientCode,
} from "../lib/ingredients/dependencies";
import type { EnrichedProject, RecipePhase } from "../types";

const phases: RecipePhase[] = [
  {
    id: "phase-a",
    name: "Phase A",
    color: "blue",
    steps: [
      {
        id: "step-a1",
        label: "Add sugar",
        type: "weighing",
        ingredientId: "ing-sugar",
        expectedWeight: 100,
        unit: "g",
      },
      { id: "step-a2", label: "Mix", type: "process" },
    ],
  },
  {
    id: "phase-b",
    name: "Phase B",
    color: "green",
    steps: [{ id: "step-b1", label: "Check pH", type: "critical_check" }],
  },
];

test.describe("run execution helpers", () => {
  test("validates weighing tolerance without hook state", () => {
    expect(
      getRunValidation({
        activePhase: phases[0],
        conditionalAnswers: {},
        currentStepIndex: 0,
        qcValues: {},
        runValues: { "step-a1": 103 },
        stepLogs: {},
      })
    ).toMatchObject({
      isValid: true,
      message: "Weight within tolerance",
    });
  });

  test("rejects weighing values outside tolerance", () => {
    expect(
      getRunValidation({
        activePhase: phases[0],
        conditionalAnswers: {},
        currentStepIndex: 0,
        qcValues: {},
        runValues: { "step-a1": 110 },
        stepLogs: {},
      })
    ).toMatchObject({
      isValid: false,
      message: "Weigh ingredient to specification",
    });
  });

  test("validates critical check ranges from keyed QC values", () => {
    const qcPhase: RecipePhase = {
      id: "phase-qc",
      name: "QC",
      color: "rose",
      steps: [
        {
          id: "step-qc",
          label: "Check pH",
          type: "critical_check",
          criticalParams: [{ name: "pH", min: 3.2, max: 3.8, unit: "" }],
        },
      ],
    };

    expect(
      getRunValidation({
        activePhase: qcPhase,
        conditionalAnswers: {},
        currentStepIndex: 0,
        qcValues: { "step-qc-pH": 3.5 },
        runValues: {},
        stepLogs: {},
      })
    ).toMatchObject({ isValid: true, message: "QC Validated" });

    expect(
      getRunValidation({
        activePhase: qcPhase,
        conditionalAnswers: {},
        currentStepIndex: 0,
        qcValues: { "step-qc-pH": 4.1 },
        runValues: {},
        stepLogs: {},
      })
    ).toMatchObject({
      isValid: false,
      message: "QC Parameters Out of Range",
    });
  });

  test("builds finish payload data from phases and project ingredients", () => {
    expect(buildCompletedRunPhases(phases, { "step-a1": 101 })[0].steps[0])
      .toMatchObject({ actualWeight: 101, isCompleted: true });

    const project = {
      ingredients: [{ id: "ing-sugar", name: "Sugar", unit: "g", weight: 100 }],
    } as EnrichedProject;

    expect(buildIngredientsUsage(phases, { "step-a1": 101 }, project)).toEqual([
      { name: "Sugar", actualWeight: 101, unit: "g" },
    ]);
  });
});

test.describe("ingredient dependency helpers", () => {
  test("finds composite ingredients that directly depend on a changed ingredient", () => {
    const ingredients = [
      { _id: "ing-sugar", isComposite: false },
      {
        _id: "ing-blend",
        isComposite: true,
        subIngredients: [{ ingredientId: "ing-sugar" }],
      },
      {
        _id: "ing-other-blend",
        isComposite: true,
        subIngredients: [{ ingredientId: "ing-salt" }],
      },
    ];

    expect(findCompositeDependencies(ingredients, "ing-sugar")).toEqual([
      ingredients[1],
    ]);
  });

  test("finds unique formulas through inventory linked by ingredient code", () => {
    expect(
      findProjectIdsUsingIngredientCode({
        ingredientCode: "SUG-001",
        inventoryItems: [
          { _id: "inv-a", ingredientCode: "SUG-001" },
          { _id: "inv-b", ingredientCode: "SUG-001" },
          { _id: "inv-c", ingredientCode: "SALT-001" },
        ],
        recipeSteps: [
          { ingredientId: "inv-a", projectId: "project-1" },
          { ingredientId: "inv-b", projectId: "project-1" },
          { ingredientId: "inv-c", projectId: "project-2" },
          { ingredientId: "inv-missing", projectId: "project-3" },
        ],
      })
    ).toEqual(["project-1"]);
  });
});

test.describe("formulation save payload helpers", () => {
  test("keeps newly created draft ingredients available for formulation rows", () => {
    expect(
      buildAggregatedIngredients([
        {
          _id: "ing-draft",
          name: "New Lab Ingredient",
          status: "Draft",
          costPerKg: 12.5,
          conversions: [{ unit: "kg", grams: 1000 }],
          allergenValues: ["allergen_tree_nuts"],
          subAllergenValues: {
            allergen_tree_nuts: ["sub_allergen_walnut"],
          },
        },
      ] as unknown as Parameters<typeof buildAggregatedIngredients>[0])
    ).toEqual([
      expect.objectContaining({
        _id: "ing-draft",
        allergens: ["allergen_tree_nuts", "sub_allergen_walnut"],
        name: "New Lab Ingredient",
        unit: "kg",
        costPerKg: 12.5,
      }),
    ]);
  });

  test("carries ingredient cost per kg into derived formulation ingredients", () => {
    const recipePhases = [
      {
        id: "phase-a",
        name: "Prep",
        color: "blue",
        steps: [
          {
            id: "step-a",
            type: "weighing",
            label: "Add Cocoa",
            ingredientId: "ing-cocoa",
            expectedWeight: 250,
          },
        ],
      },
    ] as Parameters<typeof deriveIngredients>[0];
    const aggregatedIngredients = [
      {
        _id: "ing-cocoa",
        allergens: [],
        costPerKg: 9.25,
        name: "Cocoa",
        nearestExpiry: null,
        stock: 0,
        unit: "g",
      },
    ] as Parameters<typeof deriveIngredients>[1];

    expect(deriveIngredients(recipePhases, aggregatedIngredients)).toEqual([
      expect.objectContaining({
        id: "ing-cocoa",
        costPerKg: 9.25,
        weight: 250,
      }),
    ]);
  });

  test("maps database nutrients onto formulation rows and scales nutrition facts", () => {
    const aggregatedIngredients = buildAggregatedIngredients([
      {
        _id: "ing-milk",
        name: "Milk",
        costPerKg: 2,
        nutrientValues: [
          { nutrientName: "Calories", value: 60, unit: "kcal" },
          { nutrientName: "Protein", value: 3.2, unit: "g" },
          { nutrientName: "Total Fat", value: 3.4, unit: "g" },
          { nutrientName: "Carbohydrates", value: 4.8, unit: "g" },
        ],
      },
    ] as unknown as Parameters<typeof buildAggregatedIngredients>[0]);
    const recipePhases = [
      {
        id: "phase-a",
        name: "Prep",
        color: "blue",
        steps: [
          {
            id: "step-a",
            type: "weighing",
            label: "Add Milk",
            ingredientId: "ing-milk",
            expectedWeight: 200,
            unit: "g",
          },
        ],
      },
    ] as Parameters<typeof deriveIngredients>[0];
    const ingredients = deriveIngredients(recipePhases, aggregatedIngredients);

    expect(ingredients[0].nutritionPer100g).toEqual({
      calories: 60,
      protein: 3.2,
      fat: 3.4,
      carbohydrates: 4.8,
    });
    expect(calculateNutritionFacts(ingredients, 100, 200)).toEqual({
      calories: 60,
      protein: 3.2,
      fat: 3.4,
      carbohydrates: 4.8,
    });
  });

  test("recalculates allergen baseline from selected formulation ingredients", () => {
    const aggregatedIngredients = [
      {
        _id: "ing-walnut",
        name: "Walnuts",
        allergens: ["sub_allergen_walnut"],
        stock: 100,
        unit: "g",
      },
    ] as unknown as Parameters<typeof getFormulationBaselineAllergens>[1];

    expect(
      getFormulationBaselineAllergens(
        [{ id: "ing-walnut", name: "Walnuts", weight: 50, unit: "g" }],
        aggregatedIngredients,
        ["sub_allergen_walnut"]
      )
    ).toEqual(["sub_allergen_walnut", "allergen_tree_nuts"]);

    expect(
      getFormulationBaselineAllergens([], aggregatedIngredients, [
        "sub_allergen_walnut",
      ])
    ).toEqual([]);
  });

  test("merges manual allergen overrides over the live baseline", () => {
    expect(
      applyAllergenOverrides(["allergen_tree_nuts"], {
        allergen_tree_nuts: false,
      })
    ).toEqual([]);

    expect(
      applyAllergenOverrides([], {
        allergen_tree_nuts: true,
      })
    ).toEqual(["allergen_tree_nuts"]);
  });

  test("strips Convex metadata and uses current phases and ingredients", () => {
    const project = {
      _id: "project-1",
      _creationTime: 1,
      teamId: "team-1",
      userId: "user-1",
      updatedAt: 2,
      batchWeight: 999,
      servingSizeAmount: 24,
      servingSizeMode: "recipeMakes",
      name: "Sauce",
      version: "1.0",
      status: "Draft",
      lead: "Rania",
      description: "Base sauce",
      category: "General R&D",
      phases: [],
      ingredients: [],
    } as unknown as EnrichedProject;

    const payload = buildFormulationSavePayload(project, phases, [
      {
        id: "ing-sugar",
        name: "Sugar",
        weight: 100.25,
        unit: "g",
        costPerKg: 2,
      },
      {
        id: "ing-salt",
        name: "Salt",
        weight: 4.75,
        unit: "g",
        costPerKg: 10,
      },
    ]);

    expect(payload).toMatchObject({
      name: "Sauce",
      batchWeight: 105,
      batchCost: 0.25,
      costPerServing: 0.01,
      totalProjectRDCost: 0.25,
      yield: 105,
      servingSizeAmount: 24,
      servingSizeMode: "recipeMakes",
      phases,
      ingredients: [
        { id: "ing-sugar", name: "Sugar" },
        { id: "ing-salt", name: "Salt" },
      ],
    });
    expect(payload).not.toHaveProperty("_id");
    expect(payload).not.toHaveProperty("_creationTime");
    expect(payload).not.toHaveProperty("teamId");
    expect(payload).not.toHaveProperty("userId");
    expect(payload).not.toHaveProperty("updatedAt");
  });

  test("calculates recipe measures from serving mode and amount", () => {
    expect(calculateRecipeMeasures(1000, "recipeMakes", 10)).toEqual({
      batchYield: 1000,
      servingCount: 10,
      servingSizeWeight: 100,
    });

    expect(calculateRecipeMeasures(1000, "servingIs", 250)).toEqual({
      batchYield: 1000,
      servingCount: 4,
      servingSizeWeight: 250,
    });
  });

  test("normalizes serving size units to grams for recipe measures", () => {
    expect(calculateRecipeMeasures(1000, "servingIs", 0.25, "kg")).toEqual({
      batchYield: 1000,
      servingCount: 4,
      servingSizeWeight: 250,
    });

    expect(calculateRecipeMeasures(1000, "servingIs", 250_000, "mg")).toEqual({
      batchYield: 1000,
      servingCount: 4,
      servingSizeWeight: 250,
    });

    expect(calculateRecipeMeasures(1000, "servingIs", 250, "ml")).toEqual({
      batchYield: 1000,
      servingCount: 4,
      servingSizeWeight: 250,
    });
  });

  test("calculates recipe costs from ingredient cost per kg", () => {
    expect(
      calculateRecipeCosts(
        [
          {
            id: "ing-flour",
            name: "Flour",
            weight: 500,
            unit: "g",
            costPerKg: 4,
          },
          {
            id: "ing-oil",
            name: "Oil",
            weight: 1.5,
            unit: "kg",
            costPerKg: 8,
          },
        ],
        14
      )
    ).toEqual({
      batchCost: 14,
      costPerServing: 1,
    });
  });

  test("adds packaging cost to finished good unit cost", () => {
    expect(
      calculatePackagingCosts({
        costPerServing: 1.25,
        packagingUnitPrice: 0.08,
      })
    ).toEqual({
      packagingCostPerUnit: 0.08,
      finishedGoodCostPerUnit: 1.33,
    });
  });

  test("warns when serving weight exceeds packaging capacity", () => {
    expect(
      isServingOverPackagingCapacity({
        packagingCapacity: 100,
        servingSizeWeight: 150,
      })
    ).toBe(true);
    expect(
      isServingOverPackagingCapacity({
        packagingCapacity: 250,
        servingSizeWeight: 150,
      })
    ).toBe(false);
  });

  test("flags regulation compliance breaches from row percentage limits", () => {
    expect(
      calculateRegulationCompliance({
        batchWeight: 1000,
        maxLimitPercent: 5,
        weight: 75,
      })
    ).toEqual({
      actualPercent: 7.5,
      effectiveMaxLimitPercent: 5,
      exceedsLimit: true,
    });

    expect(
      calculateRegulationCompliance({
        additiveLimit: { status: "found", mgPerKg: 1000 },
        batchWeight: 1000,
        weight: 50,
      })
    ).toEqual({
      actualPercent: 5,
      effectiveMaxLimitPercent: 0.1,
      exceedsLimit: true,
    });
  });

  test("adds a cloned draft batch cost to the prior project R&D total once", () => {
    expect(calculateProjectRDCost(undefined, undefined, 12.5)).toBe(12.5);
    expect(calculateProjectRDCost(20, undefined, 12.5)).toBe(32.5);
    expect(calculateProjectRDCost(32.5, 12.5, 12.5)).toBe(32.5);
  });
});

test.describe("formulation editing helpers", () => {
  test("updates and deletes phases without mutating unrelated phases", () => {
    expect(updatePhaseInPhases(phases, "phase-a", { name: "Prep" })[0].name).toBe(
      "Prep"
    );
    expect(deletePhaseFromPhases(phases, "phase-a")).toHaveLength(1);
  });

  test("adds a new weighing row directly below the selected row", () => {
    const { phases: nextPhases, newStep } = addStepAfterStepInPhase(
      phases,
      "phase-a",
      "step-a1",
      "weighing",
      "pH Level"
    );

    expect(nextPhases[0].steps.map((step) => step.id)).toEqual([
      "step-a1",
      newStep.id,
      "step-a2",
    ]);
    expect(newStep).toMatchObject({
      type: "weighing",
      expectedWeight: 0,
    });
  });

  test("updates, deletes, and reorders steps inside one phase", () => {
    expect(
      updateStepInPhase(phases, "phase-a", "step-a2", { label: "Blend" })[0]
        .steps[1].label
    ).toBe("Blend");

    expect(deleteStepFromPhase(phases, "phase-a", "step-a1")[0].steps).toEqual([
      expect.objectContaining({ id: "step-a2" }),
    ]);

    expect(reorderStepInPhase(phases, "phase-a", 0, 1)[0].steps.map((s) => s.id))
      .toEqual(["step-a2", "step-a1"]);
  });

  test("reorders phases and reapplies color sequence", () => {
    const reordered = reorderPhases(phases, 0, 1);
    expect(reordered.map((phase) => phase.id)).toEqual(["phase-b", "phase-a"]);
    expect(reordered.map((phase) => phase.color)).toEqual(["blue", "green"]);
  });
});
