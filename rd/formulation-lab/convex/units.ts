/**
 * Unit conversion utilities for inventory management.
 *
 * Two unit families are supported:
 *   Mass:   mg, g, kg, oz, lb  (base: g)
 *   Volume: mL, L, fl oz, gal  (base: mL)
 */

const UNIT_CONFIG: Record<string, { base: string; factor: number }> = {
  // Mass → grams
  mg: { base: "g", factor: 0.001 },
  g: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  oz: { base: "g", factor: 28.3495 },
  lb: { base: "g", factor: 453.592 },
  // Volume → mL
  mL: { base: "mL", factor: 1 },
  L: { base: "mL", factor: 1000 },
  "fl oz": { base: "mL", factor: 29.5735 },
  gal: { base: "mL", factor: 3785.41 },
};

/** All supported unit keys */
export const SUPPORTED_UNITS = Object.keys(UNIT_CONFIG);

/** Mass units for UI dropdowns */
export const MASS_UNITS = ["mg", "g", "kg", "oz", "lb"];

/** Volume units for UI dropdowns */
export const VOLUME_UNITS = ["mL", "L", "fl oz", "gal"];

/** Check if a unit string is a recognised unit */
export function isKnownUnit(unit: string): boolean {
  return unit in UNIT_CONFIG;
}

/** Check whether two units belong to the same family (mass↔mass, vol↔vol) */
export function areSameFamily(unitA: string, unitB: string): boolean {
  const a = UNIT_CONFIG[unitA];
  const b = UNIT_CONFIG[unitB];
  if (!(a && b)) {
    return false;
  }
  return a.base === b.base;
}

/**
 * Convert a value from one unit to another.
 * Returns `null` if either unit is unknown or the units are in different families.
 */
export function convertUnits(
  value: number,
  fromUnit: string,
  toUnit: string
): number | null {
  if (fromUnit === toUnit) {
    return value;
  }

  const from = UNIT_CONFIG[fromUnit];
  const to = UNIT_CONFIG[toUnit];
  if (!(from && to)) {
    return null;
  }
  if (from.base !== to.base) {
    return null;
  }

  // Convert: fromUnit → base → toUnit
  const baseValue = value * from.factor;
  return baseValue / to.factor;
}

/**
 * Return all units in the same family as the given unit.
 * E.g. getUnitFamily('kg') → ['mg','g','kg','oz','lb']
 * Returns ['g'] as fallback for unknown units.
 */
export function getUnitFamily(unit: string): string[] {
  const cfg = UNIT_CONFIG[unit];
  if (!cfg) {
    return ["g"];
  }
  return Object.entries(UNIT_CONFIG)
    .filter(([_, c]) => c.base === cfg.base)
    .map(([key]) => key);
}
