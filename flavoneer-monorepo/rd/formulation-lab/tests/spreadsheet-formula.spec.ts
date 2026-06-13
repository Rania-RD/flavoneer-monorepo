import { expect, test } from "@playwright/test";
import type { MiniSpreadsheet } from "../types";
import { evaluateSheet } from "../lib/spreadsheet/formula-engine";

function sheet(cells: MiniSpreadsheet["cells"]): MiniSpreadsheet {
  return {
    sheetKey: "test",
    rows: 8,
    cols: 6,
    cells,
    revision: 0,
  };
}

test.describe("spreadsheet formula engine", () => {
  test("evaluates arithmetic and references", () => {
    const result = evaluateSheet(
      sheet({
        A1: { raw: "10" },
        A2: { raw: "=A1*2+5" },
      })
    );
    expect(result.cells.A2.display).toBe("25");
  });

  test("evaluates supported aggregate functions", () => {
    const result = evaluateSheet(
      sheet({
        A1: { raw: "10" },
        A2: { raw: "20" },
        A3: { raw: "30" },
        B1: { raw: "=SUM(A1:A3)" },
        B2: { raw: "=AVERAGE(A1:A3)" },
        B3: { raw: "=MIN(A1:A3)" },
        B4: { raw: "=MAX(A1:A3)" },
        B5: { raw: "=COUNT(A1:A3)" },
      })
    );
    expect(result.cells.B1.display).toBe("60");
    expect(result.cells.B2.display).toBe("20");
    expect(result.cells.B3.display).toBe("10");
    expect(result.cells.B4.display).toBe("30");
    expect(result.cells.B5.display).toBe("3");
  });

  test("returns REF for out-of-bounds references", () => {
    const result = evaluateSheet(sheet({ A1: { raw: "=Z99" } }));
    expect(result.cells.A1.error).toBe("REF");
    expect(result.cells.A1.display).toBe("#REF");
  });

  test("returns CYCLE for circular references", () => {
    const result = evaluateSheet(
      sheet({
        A1: { raw: "=A2" },
        A2: { raw: "=A1" },
      })
    );
    expect(result.cells.A1.display).toBe("#CYCLE");
  });

  test("resolves named formulation values", () => {
    const result = evaluateSheet(
      sheet({
        A1: { raw: "=TOTAL_WEIGHT()" },
        A2: { raw: '=INGREDIENT_WEIGHT("Sugar")' },
        A3: { raw: '=PHASE_TOTAL("Prep")' },
      }),
      {
        ingredients: [
          { id: "ing-a", name: "Sugar", weight: 10 },
          { id: "ing-b", name: "Salt", weight: 5 },
        ],
        phases: [
          {
            name: "Prep",
            steps: [
              { type: "weighing", expectedWeight: 4 },
              { type: "process" },
            ],
          },
        ],
      }
    );
    expect(result.cells.A1.display).toBe("15");
    expect(result.cells.A2.display).toBe("10");
    expect(result.cells.A3.display).toBe("4");
  });
});

