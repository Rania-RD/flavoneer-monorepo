export const MAX_SPREADSHEET_ROWS = 50;
export const MAX_SPREADSHEET_COLS = 20;
export const DEFAULT_SPREADSHEET_ROWS = 8;
export const DEFAULT_SPREADSHEET_COLS = 6;

const CELL_KEY_RE = /^([A-Z]+)([1-9][0-9]*)$/;

export function columnNameToIndex(columnName: string): number {
  let index = 0;
  for (const char of columnName.toUpperCase()) {
    const code = char.charCodeAt(0);
    if (code < 65 || code > 90) {
      throw new Error(`Invalid column name: ${columnName}`);
    }
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

export function indexToColumnName(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid column index: ${index}`);
  }
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

export function cellKeyToCoords(cellKey: string): { row: number; col: number } {
  const match = cellKey.trim().toUpperCase().match(CELL_KEY_RE);
  if (!match) {
    throw new Error(`Invalid cell key: ${cellKey}`);
  }
  return {
    row: Number.parseInt(match[2], 10) - 1,
    col: columnNameToIndex(match[1]),
  };
}

export function coordsToCellKey(row: number, col: number): string {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0) {
    throw new Error(`Invalid cell coordinates: ${row}, ${col}`);
  }
  return `${indexToColumnName(col)}${row + 1}`;
}

export function isCellInBounds(
  cellKey: string,
  rows: number,
  cols: number
): boolean {
  try {
    const coords = cellKeyToCoords(cellKey);
    return coords.row >= 0 && coords.row < rows && coords.col >= 0 && coords.col < cols;
  } catch {
    return false;
  }
}

export function clampSheetRows(rows: number): number {
  return Math.max(1, Math.min(MAX_SPREADSHEET_ROWS, Math.floor(rows)));
}

export function clampSheetCols(cols: number): number {
  return Math.max(1, Math.min(MAX_SPREADSHEET_COLS, Math.floor(cols)));
}

export function expandRange(
  range: string,
  bounds?: { rows: number; cols: number }
): string[] {
  const [start, end] = range.toUpperCase().split(":");
  if (!(start && end)) {
    throw new Error(`Invalid range: ${range}`);
  }
  const startCoords = cellKeyToCoords(start);
  const endCoords = cellKeyToCoords(end);
  const minRow = Math.min(startCoords.row, endCoords.row);
  const maxRow = Math.max(startCoords.row, endCoords.row);
  const minCol = Math.min(startCoords.col, endCoords.col);
  const maxCol = Math.max(startCoords.col, endCoords.col);
  const keys: string[] = [];

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const key = coordsToCellKey(row, col);
      if (bounds && !isCellInBounds(key, bounds.rows, bounds.cols)) {
        throw new Error(`Range outside sheet bounds: ${range}`);
      }
      keys.push(key);
    }
  }

  return keys;
}

