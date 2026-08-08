export const PRODUCTION_LINE_READING_KEYS = [
  "pour_weight",
  "additive_weight",
  "chocolate_temperature",
  "coated_piece_weight",
  "carton_weight",
] as const;

export type ProductionLineReadingKey = (typeof PRODUCTION_LINE_READING_KEYS)[number];

export const PRODUCTION_LINE_CHECK_KEYS = [
  "sealing_machine",
  "production_date",
  "batch_number",
  "weight_or_volume",
  "chocolate_weight",
  "packaging",
  "product_shape",
  "raw_materials",
  "count",
  "taste",
  "floors",
  "orderliness",
  "personal_hygiene",
  "work_clothes",
  "waste",
  "occupational_safety",
  "washbasins",
  "cleaning_materials",
  "walls_and_ceilings",
  "gloves",
  "machinery_and_equipment",
  "maintenance_equipment",
] as const;

export type ProductionLineCheckKey = (typeof PRODUCTION_LINE_CHECK_KEYS)[number];

export type ProductionLineSubmissionRequirement =
  | "batch_label_photo"
  | "batch_code_confirmation"
  | "required_measurements"
  | "compliance_checks";

interface ProductionLineSubmissionSnapshot {
  checks: ReadonlyArray<{
    checkKey: ProductionLineCheckKey;
    checked: boolean;
  }>;
  hasBatchLabelPhoto: boolean;
  hasConfirmedBatchCode: boolean;
  limits: ReadonlyArray<{
    minimumReadingCount: number;
    readingKey: ProductionLineReadingKey;
  }>;
  readings: ReadonlyArray<{
    readingIndex: number;
    readingKey: ProductionLineReadingKey;
    value: number;
  }>;
}

export interface ProductionLineSubmissionReadiness {
  isReady: boolean;
  missingRequirements: ProductionLineSubmissionRequirement[];
}

export function getProductionLineSubmissionReadiness(
  snapshot: ProductionLineSubmissionSnapshot,
): ProductionLineSubmissionReadiness {
  const missingRequirements: ProductionLineSubmissionRequirement[] = [];

  if (!snapshot.hasBatchLabelPhoto) {
    missingRequirements.push("batch_label_photo");
  }
  if (!snapshot.hasConfirmedBatchCode) {
    missingRequirements.push("batch_code_confirmation");
  }

  const readingsByKey = new Map<ProductionLineReadingKey, Set<number>>();
  for (const reading of snapshot.readings) {
    if (!Number.isFinite(reading.value)) {
      continue;
    }
    const indexes = readingsByKey.get(reading.readingKey) ?? new Set<number>();
    indexes.add(reading.readingIndex);
    readingsByKey.set(reading.readingKey, indexes);
  }
  const limitsByKey = new Map(snapshot.limits.map((limit) => [limit.readingKey, limit]));
  const hasAllRequiredMeasurements = PRODUCTION_LINE_READING_KEYS.every((readingKey) => {
    const limit = limitsByKey.get(readingKey);
    const indexes = readingsByKey.get(readingKey);
    if (!limit) {
      return false;
    }
    for (let readingIndex = 1; readingIndex <= limit.minimumReadingCount; readingIndex += 1) {
      if (!indexes?.has(readingIndex)) {
        return false;
      }
    }
    return true;
  });
  if (!hasAllRequiredMeasurements) {
    missingRequirements.push("required_measurements");
  }

  const completedChecks = new Set(
    snapshot.checks.filter((check) => check.checked).map((check) => check.checkKey),
  );
  if (PRODUCTION_LINE_CHECK_KEYS.some((checkKey) => !completedChecks.has(checkKey))) {
    missingRequirements.push("compliance_checks");
  }

  return {
    isReady: missingRequirements.length === 0,
    missingRequirements,
  };
}

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
