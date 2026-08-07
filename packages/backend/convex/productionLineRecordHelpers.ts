export const PRODUCTION_LINE_READING_KEYS = [
  "pour_weight",
  "additive_weight",
  "chocolate_temperature",
  "coated_piece_weight",
  "carton_weight",
] as const;

export type ProductionLineReadingKey = (typeof PRODUCTION_LINE_READING_KEYS)[number];

export interface ParsedPrintedBatchCode {
  dailyBatchSequence: number;
  labelProductionDate: string;
  normalizedCode: string;
}

export function parsePrintedBatchCode(input: string): ParsedPrintedBatchCode {
  const normalizedCode = input.trim().replace(/\s+/g, " ");
  const match = /^(\d{2})(\d{2})(\d{2}) ([1-9])$/.exec(normalizedCode);
  if (!match) {
    throw new Error("Batch code must use DDMMYY N, with sequence 1–9");
  }

  const [, dayText, monthText, yearText, sequenceText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = 2000 + Number(yearText);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error("Batch code contains an invalid production date");
  }

  return {
    dailyBatchSequence: Number(sequenceText),
    labelProductionDate: `${year.toString().padStart(4, "0")}-${monthText}-${dayText}`,
    normalizedCode,
  };
}

export function buildInspectionHourKey(inspectionAt: number, timezone: string): string {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(inspectionAt));
  } catch {
    throw new Error("Production-line timezone must be a valid IANA timezone");
  }

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const hour = value("hour");

  if (!(year && month && day && hour)) {
    throw new Error("Could not calculate the production inspection hour");
  }

  return `${year}-${month}-${day}T${hour}`;
}

export function buildDisplaySerial(hallCode: "A" | "B", sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error("Serial sequence must be a positive integer");
  }
  return `${hallCode} ${sequence}`;
}
