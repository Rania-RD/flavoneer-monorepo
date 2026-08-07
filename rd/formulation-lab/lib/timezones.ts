export interface TimezoneOption {
  city: string;
  id: string;
  offset: string;
  region: string;
  searchValue: string;
}

const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Gaza",
  "Asia/Jerusalem",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Riyadh",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Paris",
  "Pacific/Auckland",
] as const;

const humanizeTimezonePart = (value: string) => value.replaceAll("_", " ");

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function formatTimezoneOffset(
  timezone: string,
  date = new Date()
): string {
  try {
    const offset = new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      timeZone: timezone,
      timeZoneName: "longOffset",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value;

    return offset ?? "GMT";
  } catch {
    return "GMT";
  }
}

export function buildTimezoneOption(
  id: string,
  date = new Date()
): TimezoneOption {
  const parts = id.split("/");
  const city = humanizeTimezonePart(parts.at(-1) ?? id);
  const region =
    parts.length > 1
      ? parts.slice(0, -1).map(humanizeTimezonePart).join(" / ")
      : "UTC";
  const offset = formatTimezoneOffset(id, date);

  return {
    city,
    id,
    offset,
    region,
    searchValue: `${id} ${city} ${region} ${offset}`.toLocaleLowerCase(),
  };
}

export function getSupportedTimezones(
  selectedTimezone?: string,
  date = new Date()
): TimezoneOption[] {
  const supportedValuesOf = (
    Intl as typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[];
    }
  ).supportedValuesOf;
  const timezoneIds = supportedValuesOf
    ? supportedValuesOf.call(Intl, "timeZone")
    : [...FALLBACK_TIMEZONES];

  timezoneIds.push("UTC");
  if (selectedTimezone) {
    timezoneIds.push(selectedTimezone);
  }

  return [...new Set(timezoneIds)]
    .sort((first, second) => first.localeCompare(second))
    .map((timezone) => buildTimezoneOption(timezone, date));
}

export function matchesTimezone(
  timezone: TimezoneOption,
  query: string
): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return !normalizedQuery || timezone.searchValue.includes(normalizedQuery);
}
