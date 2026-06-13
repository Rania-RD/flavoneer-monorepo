import { ABS, AVERAGE, COUNT, MAX, MIN, ROUND, SUM } from "@formulajs/formulajs";
import type {
  Ingredient,
  MiniSpreadsheet,
  MiniSpreadsheetCell,
  SpreadsheetCellValue,
} from "../../types";
import { cellKeyToCoords, expandRange, isCellInBounds } from "./cell-address";

export interface SpreadsheetFormulaContext {
  ingredients?: Ingredient[];
  phases?: { name: string; steps: { type: string; expectedWeight?: number }[] }[];
}

type EvaluationResult =
  | { value: SpreadsheetCellValue; display: string }
  | { error: "ERROR" | "REF" | "CYCLE" };

const SUPPORTED_FUNCTIONS = new Set([
  "SUM",
  "AVERAGE",
  "MIN",
  "MAX",
  "COUNT",
  "ROUND",
  "ABS",
  "TOTAL_WEIGHT",
  "INGREDIENT_WEIGHT",
  "PHASE_TOTAL",
]);

const FORMULA_FUNCTIONS: Record<string, (...args: unknown[]) => unknown> = {
  SUM: (...args) => SUM(flatten(args)),
  AVERAGE: (...args) => AVERAGE(flatten(args)),
  MIN: (...args) => MIN(flatten(args)),
  MAX: (...args) => MAX(flatten(args)),
  COUNT: (...args) => COUNT(flatten(args)),
  ROUND: (value, places = 0) => ROUND(Number(value), Number(places)),
  ABS: (value) => ABS(Number(value)),
};

function flatten(values: unknown[]): unknown[] {
  return values.flatMap((value) => (Array.isArray(value) ? flatten(value) : value));
}

function parseLiteral(raw: string): EvaluationResult {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { value: null, display: "" };
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const value = Number(trimmed);
    return { value, display: String(value) };
  }
  if (/^(true|false)$/i.test(trimmed)) {
    const value = trimmed.toLowerCase() === "true";
    return { value, display: value ? "TRUE" : "FALSE" };
  }
  return { value: raw, display: raw };
}

function displayValue(value: SpreadsheetCellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return String(value);
}

function numericValue(value: SpreadsheetCellValue): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return 0;
}

function totalWeight(context: SpreadsheetFormulaContext): number {
  return (context.ingredients ?? []).reduce((sum, ingredient) => sum + ingredient.weight, 0);
}

function ingredientWeight(name: string, context: SpreadsheetFormulaContext): number {
  return (
    context.ingredients?.find(
      (ingredient) => ingredient.name.toLowerCase() === name.toLowerCase()
    )?.weight ?? 0
  );
}

function phaseTotal(name: string, context: SpreadsheetFormulaContext): number {
  const phase = context.phases?.find(
    (item) => item.name.toLowerCase() === name.toLowerCase()
  );
  return (
    phase?.steps.reduce(
      (sum, step) =>
        step.type === "weighing" ? sum + (step.expectedWeight ?? 0) : sum,
      0
    ) ?? 0
  );
}

function assertSupportedFormula(expression: string): boolean {
  const withoutStrings = expression.replace(/"[^"]*"|'[^']*'/g, "");
  const identifiers = withoutStrings.match(/\b[A-Z_][A-Z0-9_]*\b/gi) ?? [];
  for (const identifier of identifiers) {
    const upper = identifier.toUpperCase();
    if (/^[A-Z]{1,2}[1-9][0-9]*$/.test(upper)) {
      continue;
    }
    if (!SUPPORTED_FUNCTIONS.has(upper) && upper !== "TRUE" && upper !== "FALSE") {
      return false;
    }
  }
  return true;
}

export function evaluateSheet(
  spreadsheet: MiniSpreadsheet,
  context: SpreadsheetFormulaContext = {}
): MiniSpreadsheet {
  const cache = new Map<string, EvaluationResult>();
  const cells = { ...spreadsheet.cells };

  const evaluateCell = (cellKey: string, stack: string[]): EvaluationResult => {
    const key = cellKey.toUpperCase();
    if (!isCellInBounds(key, spreadsheet.rows, spreadsheet.cols)) {
      return { error: "REF" };
    }
    if (stack.includes(key)) {
      return { error: "CYCLE" };
    }
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const cell = cells[key];
    if (!cell || cell.raw.trim() === "") {
      const blank = { value: null, display: "" } satisfies EvaluationResult;
      cache.set(key, blank);
      return blank;
    }

    if (!cell.raw.startsWith("=")) {
      const literal = parseLiteral(cell.raw);
      cache.set(key, literal);
      return literal;
    }

    const result = evaluateFormula(cell.raw.slice(1), [...stack, key], evaluateCell, spreadsheet, context);
    cache.set(key, result);
    return result;
  };

  for (const cellKey of Object.keys(cells)) {
    const key = cellKey.toUpperCase();
    const result = evaluateCell(key, []);
    const current = cells[key] as MiniSpreadsheetCell;
    cells[key] = {
      ...current,
      formula: current.raw.startsWith("=") ? current.raw.slice(1) : undefined,
      value: "value" in result ? result.value : null,
      display: "display" in result ? result.display : `#${result.error}`,
      error: "error" in result ? result.error : undefined,
    };
  }

  return { ...spreadsheet, cells };
}

function evaluateFormula(
  formula: string,
  stack: string[],
  evaluateCell: (cellKey: string, stack: string[]) => EvaluationResult,
  spreadsheet: MiniSpreadsheet,
  context: SpreadsheetFormulaContext
): EvaluationResult {
  try {
    if (!assertSupportedFormula(formula)) {
      return { error: "ERROR" };
    }

    const refs = new Map<string, SpreadsheetCellValue>();
    const ranges = new Map<string, SpreadsheetCellValue[]>();
    let rangeIndex = 0;

    let expression = formula.replace(
      /\b([A-Z]{1,2}[1-9][0-9]*):([A-Z]{1,2}[1-9][0-9]*)\b/gi,
      (match) => {
        const token = `__range_${rangeIndex++}`;
        let keys: string[];
        try {
          keys = expandRange(match.toUpperCase(), {
            rows: spreadsheet.rows,
            cols: spreadsheet.cols,
          });
        } catch {
          throw new Error("REF");
        }
        const values = keys.map((key) => {
          const result = evaluateCell(key, stack);
          if ("error" in result) {
            throw new Error(result.error);
          }
          return numericValue(result.value);
        });
        ranges.set(token, values);
        return token;
      }
    );

    expression = expression.replace(/\b([A-Z]{1,2}[1-9][0-9]*)\b/gi, (match) => {
      const key = match.toUpperCase();
      cellKeyToCoords(key);
      if (!isCellInBounds(key, spreadsheet.rows, spreadsheet.cols)) {
        throw new Error("REF");
      }
      const result = evaluateCell(key, stack);
      if ("error" in result) {
        throw new Error(result.error);
      }
      const token = `__cell_${key}`;
      refs.set(token, numericValue(result.value));
      return token;
    });

    expression = expression.replace(/\b(TRUE|FALSE)\b/gi, (match) =>
      match.toUpperCase() === "TRUE" ? "true" : "false"
    );

    const names = [
      ...Object.keys(FORMULA_FUNCTIONS),
      "TOTAL_WEIGHT",
      "INGREDIENT_WEIGHT",
      "PHASE_TOTAL",
    ];
    for (const name of names) {
      expression = expression.replace(new RegExp(`\\b${name}\\b`, "gi"), name);
    }

    const scope = {
      ...FORMULA_FUNCTIONS,
      TOTAL_WEIGHT: () => totalWeight(context),
      INGREDIENT_WEIGHT: (name: string) => ingredientWeight(String(name), context),
      PHASE_TOTAL: (name: string) => phaseTotal(String(name), context),
      ...Object.fromEntries(refs),
      ...Object.fromEntries(ranges),
    };

    const fn = new Function(...Object.keys(scope), `"use strict"; return (${expression});`);
    const rawValue = fn(...Object.values(scope)) as unknown;
    if (rawValue instanceof Error || Number.isNaN(rawValue as number)) {
      return { error: "ERROR" };
    }
    const value = rawValue as SpreadsheetCellValue;
    return { value, display: displayValue(value) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "REF") {
      return { error: "REF" };
    }
    if (message === "CYCLE") {
      return { error: "CYCLE" };
    }
    return { error: "ERROR" };
  }
}
