import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, type QueryCtx, query } from "./_generated/server";
import { miniSpreadsheetValidator, spreadsheetCellValidator } from "./validators";

const DEFAULT_ROWS = 8;
const DEFAULT_COLS = 6;
const MAX_ROWS = 50;
const MAX_COLS = 20;

interface SpreadsheetCell {
  raw: string;
  value?: string | number | boolean | null;
  display?: string;
  formula?: string;
  error?: "ERROR" | "REF" | "CYCLE";
  updatedAt?: number;
  updatedBy?: string;
}

interface MiniSpreadsheet {
  sheetKey: string;
  rows: number;
  cols: number;
  cells: Record<string, SpreadsheetCell>;
  revision: number;
  updatedAt?: number;
  updatedBy?: string;
}

function defaultMiniSpreadsheet(stepKey: string): MiniSpreadsheet {
  return {
    sheetKey: stepKey,
    rows: DEFAULT_ROWS,
    cols: DEFAULT_COLS,
    cells: {},
    revision: 0,
  };
}

async function findStep(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  stepKey: string
) {
  const steps = await ctx.db
    .query("recipeSteps")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .collect();
  return steps.find((step) => step.stepKey === stepKey) ?? null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function cellKeyToCoords(cellKey: string) {
  const match = cellKey.toUpperCase().match(/^([A-Z]+)([1-9][0-9]*)$/);
  if (!match) {
    throw new Error("Invalid cell key");
  }
  let col = 0;
  for (const char of match[1]) {
    col = col * 26 + (char.charCodeAt(0) - 64);
  }
  return { col: col - 1, row: Number.parseInt(match[2], 10) - 1 };
}

function coordsToCellKey(row: number, col: number) {
  let value = col + 1;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return `${name}${row + 1}`;
}

function normalizeSpreadsheet(step: Doc<"recipeSteps">): MiniSpreadsheet {
  return step.spreadsheet ?? defaultMiniSpreadsheet(step.stepKey);
}

async function loadEditableStep(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  stepKey: string
) {
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found");
  }
  if (project.status === "Released") {
    throw new Error("Released formulations are read-only");
  }

  const step = await findStep(ctx, projectId, stepKey);
  if (!step) {
    throw new Error("Spreadsheet step not found");
  }
  if (step.type !== "spreadsheet_note") {
    throw new Error("Step is not a spreadsheet note");
  }
  return step;
}

export const getByStep = query({
  args: {
    projectId: v.id("projects"),
    stepKey: v.string(),
  },
  returns: miniSpreadsheetValidator,
  handler: async (ctx, args) => {
    const step = await findStep(ctx, args.projectId, args.stepKey);
    if (!step) {
      return defaultMiniSpreadsheet(args.stepKey);
    }
    return normalizeSpreadsheet(step);
  },
});

export const updateCell = mutation({
  args: {
    projectId: v.id("projects"),
    stepKey: v.string(),
    cellKey: v.string(),
    cell: spreadsheetCellValidator,
    baseRevision: v.optional(v.number()),
  },
  returns: miniSpreadsheetValidator,
  handler: async (ctx, args) => {
    const step = await loadEditableStep(ctx, args.projectId, args.stepKey);
    const userId = (await ctx.auth.getUserIdentity())?.subject ?? "system";
    const now = Date.now();
    const spreadsheet = normalizeSpreadsheet(step);
    const cellKey = args.cellKey.toUpperCase();
    cellKeyToCoords(cellKey);

    const next = {
      ...spreadsheet,
      cells: {
        ...spreadsheet.cells,
        [cellKey]: {
          ...args.cell,
          updatedAt: now,
          updatedBy: userId,
        },
      },
      revision: spreadsheet.revision + 1,
      updatedAt: now,
      updatedBy: userId,
    };

    await ctx.db.patch(step._id, { spreadsheet: next });
    return next;
  },
});

export const resize = mutation({
  args: {
    projectId: v.id("projects"),
    stepKey: v.string(),
    rows: v.number(),
    cols: v.number(),
  },
  returns: miniSpreadsheetValidator,
  handler: async (ctx, args) => {
    const step = await loadEditableStep(ctx, args.projectId, args.stepKey);
    const userId = (await ctx.auth.getUserIdentity())?.subject ?? "system";
    const now = Date.now();
    const spreadsheet = normalizeSpreadsheet(step);
    const rows = clamp(args.rows, 1, MAX_ROWS);
    const cols = clamp(args.cols, 1, MAX_COLS);
    const cells: Record<string, SpreadsheetCell> = Object.fromEntries(
      Object.entries(spreadsheet.cells).filter(([key]) => {
        const coords = cellKeyToCoords(key);
        return coords.row < rows && coords.col < cols;
      })
    ) as Record<string, SpreadsheetCell>;
    const next = {
      ...spreadsheet,
      rows,
      cols,
      cells,
      revision: spreadsheet.revision + 1,
      updatedAt: now,
      updatedBy: userId,
    };
    await ctx.db.patch(step._id, { spreadsheet: next });
    return next;
  },
});

export const clearRange = mutation({
  args: {
    projectId: v.id("projects"),
    stepKey: v.string(),
    startCell: v.string(),
    endCell: v.string(),
  },
  returns: miniSpreadsheetValidator,
  handler: async (ctx, args) => {
    const step = await loadEditableStep(ctx, args.projectId, args.stepKey);
    const userId = (await ctx.auth.getUserIdentity())?.subject ?? "system";
    const now = Date.now();
    const spreadsheet = normalizeSpreadsheet(step);
    const start = cellKeyToCoords(args.startCell);
    const end = cellKeyToCoords(args.endCell);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const cells: Record<string, SpreadsheetCell> = { ...spreadsheet.cells };

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        delete cells[coordsToCellKey(row, col)];
      }
    }

    const next = {
      ...spreadsheet,
      cells,
      revision: spreadsheet.revision + 1,
      updatedAt: now,
      updatedBy: userId,
    };
    await ctx.db.patch(step._id, { spreadsheet: next });
    return next;
  },
});
