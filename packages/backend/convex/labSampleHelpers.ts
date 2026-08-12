export type LabSampleType = "raw_material" | "final_product";

const MAXIMUM_SEQUENCE: Record<LabSampleType, number> = {
  raw_material: 999,
  final_product: 9999,
};

export function getSampleYear(sampledAt: number, timezone: string): number {
  if (!Number.isFinite(sampledAt)) {
    throw new Error("Sample time is invalid");
  }

  let yearText: string | undefined;
  try {
    yearText = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
    })
      .formatToParts(new Date(sampledAt))
      .find((part) => part.type === "year")?.value;
  } catch {
    throw new Error("Sample timezone must be a valid IANA timezone");
  }

  const year = Number(yearText);
  if (!Number.isSafeInteger(year)) {
    throw new Error("Could not calculate the sample year");
  }
  return year;
}

export function buildLabSampleNumber(
  sampleType: LabSampleType,
  year: number,
  sequence: number,
): string {
  const maximumSequence = MAXIMUM_SEQUENCE[sampleType];
  if (!Number.isSafeInteger(year) || year < 2000 || year > 2099) {
    throw new Error("Sample year must be between 2000 and 2099");
  }
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > maximumSequence) {
    throw new Error(`The ${sampleType.replace("_", " ")} sample sequence is exhausted for ${year}`);
  }

  const prefix = sampleType === "raw_material" ? "R" : "F";
  const width = sampleType === "raw_material" ? 3 : 4;
  return `${prefix}${String(year).slice(-2)}${String(sequence).padStart(width, "0")}`;
}

export function normalizeProductionNumber(input: string): string {
  const normalized = input.replace(/\s+/g, "");
  const match = /^(\d{2})(\d{2})(\d{2})([1-9])$/.exec(normalized);
  if (!match) {
    throw new Error("Production number must use DDMMYYN, for example 2907261");
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = 2000 + Number(yearText);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error("Production number contains an invalid date");
  }

  return normalized;
}
