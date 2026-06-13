import { expect, test } from "@playwright/test";
import { addStepToPhase, updateStepInPhase } from "../lib/formulation/editing";
import { deriveIngredients } from "../lib/formulation/helpers";
import type { AggregatedIngredient, RecipePhase, RecipeStep } from "../types";

test.describe("spreadsheet step serialization", () => {
  test("creates a spreadsheet note step with sheet data", () => {
    const phases: RecipePhase[] = [
      { id: "phase-a", name: "Prep", color: "blue", steps: [] },
    ];
    const result = addStepToPhase(
      phases,
      "phase-a",
      "spreadsheet_note",
      "pH",
      "Mini Spreadsheet"
    );
    expect(result.newStep).toMatchObject({
      type: "spreadsheet_note",
      label: "Mini Spreadsheet",
      spreadsheet: { rows: 8, cols: 6, revision: 0 },
    });
  });

  test("spreadsheet survives phase editing helpers", () => {
    const step: RecipeStep = {
      id: "sheet-step",
      type: "spreadsheet_note",
      label: "Mini Spreadsheet",
      spreadsheet: {
        sheetKey: "sheet-step",
        rows: 8,
        cols: 6,
        revision: 1,
        cells: { A1: { raw: "10", value: 10, display: "10" } },
      },
    };
    const phases: RecipePhase[] = [
      { id: "phase-a", name: "Prep", color: "blue", steps: [step] },
    ];
    const next = updateStepInPhase(phases, "phase-a", "sheet-step", {
      label: "Batch math",
    });
    expect(next[0].steps[0].spreadsheet?.cells.A1.raw).toBe("10");
  });

  test("spreadsheet step does not affect derived weighing ingredients", () => {
    const aggregatedIngredients = [
      {
        _id: "ing-a",
        name: "Sugar",
        stock: 100,
        unit: "g",
        allergens: [],
        nearestExpiry: null,
      },
    ] as AggregatedIngredient[];
    const phases: RecipePhase[] = [
      {
        id: "phase-a",
        name: "Prep",
        color: "blue",
        steps: [
          {
            id: "weigh-a",
            type: "weighing",
            label: "Sugar",
            ingredientId: "ing-a",
            expectedWeight: 20,
          },
          {
            id: "sheet-step",
            type: "spreadsheet_note",
            label: "Mini Spreadsheet",
          },
        ],
      },
    ];
    expect(deriveIngredients(phases, aggregatedIngredients)).toEqual([
      expect.objectContaining({ id: "ing-a", weight: 20 }),
    ]);
  });
});
