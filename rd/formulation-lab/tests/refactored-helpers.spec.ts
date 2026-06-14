import { expect, test } from "@playwright/test";
import {
  buildCompletedRunPhases,
  buildIngredientsUsage,
} from "../hooks/run-execution/runPersistence";
import { getRunValidation } from "../hooks/run-execution/runValidation";
import { buildFormulationSavePayload } from "../lib/formulation/save-payload";
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
  test("strips Convex metadata and uses current phases and ingredients", () => {
    const project = {
      _id: "project-1",
      _creationTime: 1,
      teamId: "team-1",
      userId: "user-1",
      updatedAt: 2,
      batchWeight: 999,
      yield: 24,
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
      { id: "ing-sugar", name: "Sugar", weight: 100.25, unit: "g" },
      { id: "ing-salt", name: "Salt", weight: 4.75, unit: "g" },
    ]);

    expect(payload).toMatchObject({
      name: "Sauce",
      batchWeight: 105,
      yield: 24,
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
