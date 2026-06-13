export const GMP_LIMIT_MG_PER_KG = 99_999;

export function normalizeInsNumber(value: string | undefined | null): string {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .replace(/^INS\s*/i, "")
    .replace(/^E\s*/i, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function displayInsNumber(value: string | undefined | null): string {
  const normalized = normalizeInsNumber(value);
  return normalized ? `INS ${normalized}` : "";
}

export function plainInsNumber(value: string | undefined | null): number | undefined {
  const normalized = normalizeInsNumber(value);
  const match = normalized.match(/^\d+/);
  if (!match) {
    return undefined;
  }

  const parsed = Number.parseInt(match[0], 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function parentCategoryCodes(categoryCode: string): string[] {
  const codes: string[] = [];
  let current = categoryCode.trim();

  while (current) {
    codes.push(current.includes(".") ? current : `${current}.0`);
    const lastDot = current.lastIndexOf(".");
    if (lastDot === -1) {
      break;
    }
    current = current.slice(0, lastDot);
  }

  return codes;
}

export function formatLimitValue(mgPerKg: number): string {
  if (mgPerKg >= GMP_LIMIT_MG_PER_KG) {
    return "GMP / quantum satis";
  }

  return `${new Intl.NumberFormat("en-US").format(mgPerKg)} mg/kg`;
}
