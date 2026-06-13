import {
  CompactSelection,
  DataEditor,
  GridCellKind,
  type EditableGridCell,
  type GridCell,
  type GridColumn,
  type GridSelection,
  type Item,
} from "@glideapps/glide-data-grid";
import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  clampSheetCols,
  clampSheetRows,
  coordsToCellKey,
  indexToColumnName,
  MAX_SPREADSHEET_COLS,
  MAX_SPREADSHEET_ROWS,
} from "../../lib/spreadsheet/cell-address";
import { createDefaultMiniSpreadsheet } from "../../lib/spreadsheet/defaults";
import {
  evaluateSheet,
  type SpreadsheetFormulaContext,
} from "../../lib/spreadsheet/formula-engine";
import type {
  MiniSpreadsheet,
  MiniSpreadsheetCell,
  RecipeStep,
} from "../../types";

type SaveStatus = "saved" | "saving" | "error";

interface MiniSpreadsheetEditorProps {
  formulationContext?: SpreadsheetFormulaContext;
  onLocalStepUpdate?: (stepId: string, updates: Partial<RecipeStep>) => void;
  projectId?: Id<"projects">;
  readOnly: boolean;
  step: RecipeStep;
}

function readRawCellValue(cell: EditableGridCell): string {
  if ("data" in cell && cell.data !== undefined && cell.data !== null) {
    return String(cell.data);
  }
  if ("displayData" in cell && cell.displayData) {
    return cell.displayData;
  }
  return "";
}

function buildSelectionRange(selection: GridSelection): {
  startCell: string;
  endCell: string;
} | null {
  const range = selection.current?.range;
  if (!range) {
    return null;
  }
  return {
    startCell: coordsToCellKey(range.y, range.x),
    endCell: coordsToCellKey(range.y + range.height - 1, range.x + range.width - 1),
  };
}

export function MiniSpreadsheetEditor({
  formulationContext,
  onLocalStepUpdate,
  projectId,
  readOnly,
  step,
}: MiniSpreadsheetEditorProps) {
  const { t } = useTranslation();
  const updateCell = useMutation(api.spreadsheetSteps.updateCell);
  const resizeSheet = useMutation(api.spreadsheetSteps.resize);
  const clearRangeMutation = useMutation(api.spreadsheetSteps.clearRange);
  const remoteSpreadsheet = useQuery(
    api.spreadsheetSteps.getByStep,
    projectId ? { projectId, stepKey: step.id } : "skip"
  );
  const [selection, setSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  });
  const [status, setStatus] = useState<SaveStatus>("saved");
  const pendingCellsRef = useRef<Record<string, MiniSpreadsheetCell>>({});
  const saveTimerRef = useRef<number | null>(null);
  const spreadsheet = useMemo(
    () =>
      evaluateSheet(
        step.spreadsheet ?? createDefaultMiniSpreadsheet(step.id),
        formulationContext
      ),
    [formulationContext, step.id, step.spreadsheet]
  );

  useEffect(() => {
    if (remoteSpreadsheet && Object.keys(pendingCellsRef.current).length === 0) {
      onLocalStepUpdate?.(step.id, {
        spreadsheet: evaluateSheet(remoteSpreadsheet, formulationContext),
      });
    }
  }, [formulationContext, onLocalStepUpdate, remoteSpreadsheet, step.id]);

  const columns = useMemo<GridColumn[]>(
    () =>
      Array.from({ length: spreadsheet.cols }, (_, col) => ({
        id: indexToColumnName(col),
        title: indexToColumnName(col),
        width: 96,
      })),
    [spreadsheet.cols]
  );

  const flushPending = useCallback(async () => {
    if (!(projectId && Object.keys(pendingCellsRef.current).length > 0)) {
      return;
    }
    const pending = pendingCellsRef.current;
    pendingCellsRef.current = {};
    setStatus("saving");
    try {
      await Promise.all(
        Object.entries(pending).map(([cellKey, cell]) =>
          updateCell({
            projectId,
            stepKey: step.id,
            cellKey,
            cell,
            baseRevision: spreadsheet.revision,
          })
        )
      );
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [projectId, spreadsheet.revision, step.id, updateCell]);

  const queueCellSave = useCallback(
    (cellKey: string, cell: MiniSpreadsheetCell) => {
      if (!projectId || readOnly) {
        return;
      }
      pendingCellsRef.current[cellKey] = cell;
      setStatus("saving");
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        flushPending().catch(() => setStatus("error"));
      }, 500);
    },
    [flushPending, projectId, readOnly]
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    },
    []
  );

  const applyCellValue = useCallback(
    (col: number, row: number, raw: string) => {
      const cellKey = coordsToCellKey(row, col);
      const nextCell: MiniSpreadsheetCell = { raw };
      const nextSheet: MiniSpreadsheet = evaluateSheet(
        {
          ...spreadsheet,
          cells: {
            ...spreadsheet.cells,
            [cellKey]: nextCell,
          },
        },
        formulationContext
      );
      onLocalStepUpdate?.(step.id, { spreadsheet: nextSheet });
      queueCellSave(cellKey, nextSheet.cells[cellKey] ?? nextCell);
    },
    [formulationContext, onLocalStepUpdate, queueCellSave, spreadsheet, step.id]
  );

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const key = coordsToCellKey(row, col);
      const cell = spreadsheet.cells[key];
      return {
        kind: GridCellKind.Text,
        allowOverlay: !readOnly,
        readonly: readOnly,
        data: cell?.raw ?? "",
        displayData: cell?.display ?? "",
      };
    },
    [readOnly, spreadsheet.cells]
  );

  const handleCellEdited = useCallback(
    ([col, row]: Item, value: EditableGridCell) => {
      if (readOnly) {
        return;
      }
      applyCellValue(col, row, readRawCellValue(value));
    },
    [applyCellValue, readOnly]
  );

  const handlePaste = useCallback(
    ([startCol, startRow]: Item, values: readonly (readonly string[])[]) => {
      if (readOnly) {
        return false;
      }
      let nextSheet: MiniSpreadsheet = spreadsheet;
      for (let rowOffset = 0; rowOffset < values.length; rowOffset++) {
        for (
          let colOffset = 0;
          colOffset < values[rowOffset].length;
          colOffset++
        ) {
          const row = startRow + rowOffset;
          const col = startCol + colOffset;
          if (row >= spreadsheet.rows || col >= spreadsheet.cols) {
            continue;
          }
          const cellKey = coordsToCellKey(row, col);
          nextSheet = {
            ...nextSheet,
            cells: {
              ...nextSheet.cells,
              [cellKey]: { raw: values[rowOffset][colOffset] },
            },
          };
        }
      }
      nextSheet = evaluateSheet(nextSheet, formulationContext);
      onLocalStepUpdate?.(step.id, { spreadsheet: nextSheet });
      for (const [cellKey, cell] of Object.entries(nextSheet.cells)) {
        if (cell.raw !== spreadsheet.cells[cellKey]?.raw) {
          queueCellSave(cellKey, cell);
        }
      }
      return true;
    },
    [
      formulationContext,
      onLocalStepUpdate,
      queueCellSave,
      readOnly,
      spreadsheet,
      step.id,
    ]
  );

  const handleAddRow = async () => {
    if (readOnly) {
      return;
    }
    const rows = clampSheetRows(spreadsheet.rows + 1);
    const nextSheet = { ...spreadsheet, rows };
    onLocalStepUpdate?.(step.id, { spreadsheet: nextSheet });
    if (projectId) {
      setStatus("saving");
      try {
        await resizeSheet({ projectId, stepKey: step.id, rows, cols: spreadsheet.cols });
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }
  };

  const handleAddColumn = async () => {
    if (readOnly) {
      return;
    }
    const cols = clampSheetCols(spreadsheet.cols + 1);
    const nextSheet = { ...spreadsheet, cols };
    onLocalStepUpdate?.(step.id, { spreadsheet: nextSheet });
    if (projectId) {
      setStatus("saving");
      try {
        await resizeSheet({ projectId, stepKey: step.id, rows: spreadsheet.rows, cols });
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }
  };

  const handleClearRange = async () => {
    if (readOnly) {
      return;
    }
    const range = buildSelectionRange(selection);
    const rect = selection.current?.range;
    if (!(range && rect)) {
      return;
    }
    const nextCells = { ...spreadsheet.cells };
    for (let row = rect.y; row < rect.y + rect.height; row++) {
      for (let col = rect.x; col < rect.x + rect.width; col++) {
        delete nextCells[coordsToCellKey(row, col)];
      }
    }
    const nextSheet = evaluateSheet({ ...spreadsheet, cells: nextCells }, formulationContext);
    onLocalStepUpdate?.(step.id, { spreadsheet: nextSheet });
    if (projectId) {
      setStatus("saving");
      try {
        await clearRangeMutation({
          projectId,
          stepKey: step.id,
          startCell: range.startCell,
          endCell: range.endCell,
        });
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }
  };

  const statusLabel =
    status === "saving"
      ? t("spreadsheet_saving")
      : status === "error"
        ? t("spreadsheet_save_failed")
        : t("spreadsheet_saved");

  return (
    <div className="col-span-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold text-gray-600 text-xs uppercase tracking-widest dark:text-slate-400">
          {t("mini_spreadsheet")}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-wider ${
              status === "error"
                ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300"
                : status === "saving"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
            }`}
          >
            {statusLabel}
          </span>
          {!readOnly && (
            <>
              <button
                className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                disabled={spreadsheet.rows >= MAX_SPREADSHEET_ROWS}
                onClick={handleAddRow}
                title={t("add_row")}
                type="button"
              >
                <Plus size={16} />
              </button>
              <button
                className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                disabled={spreadsheet.cols >= MAX_SPREADSHEET_COLS}
                onClick={handleAddColumn}
                title={t("add_column")}
                type="button"
              >
                <Plus className="rotate-90" size={16} />
              </button>
              <button
                className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-red-900/20"
                onClick={handleClearRange}
                title={t("clear_range")}
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
      {readOnly && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-bold text-amber-700 text-xs dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
          {t("read_only_released_formulation")}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <DataEditor
          columns={columns}
          getCellContent={getCellContent}
          getCellsForSelection={true}
          gridSelection={selection}
          height={Math.min(420, 38 * spreadsheet.rows + 52)}
          onCellEdited={handleCellEdited}
          onGridSelectionChange={setSelection}
          onPaste={handlePaste}
          rows={spreadsheet.rows}
          rowMarkers="number"
          smoothScrollX
          smoothScrollY
          width="100%"
        />
      </div>
    </div>
  );
}
