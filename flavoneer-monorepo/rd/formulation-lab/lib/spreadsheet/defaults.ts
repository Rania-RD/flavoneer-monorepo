import type { MiniSpreadsheet, RecipeStep } from "../../types";
import {
  DEFAULT_SPREADSHEET_COLS,
  DEFAULT_SPREADSHEET_ROWS,
} from "./cell-address";

export function createDefaultMiniSpreadsheet(
  sheetKey = `sheet-${Date.now()}`
): MiniSpreadsheet {
  return {
    sheetKey,
    rows: DEFAULT_SPREADSHEET_ROWS,
    cols: DEFAULT_SPREADSHEET_COLS,
    cells: {},
    revision: 0,
  };
}

export function createSpreadsheetStep(label: string): RecipeStep {
  const id = `step-${Date.now()}`;
  return {
    id,
    type: "spreadsheet_note",
    label,
    spreadsheet: createDefaultMiniSpreadsheet(id),
  };
}

