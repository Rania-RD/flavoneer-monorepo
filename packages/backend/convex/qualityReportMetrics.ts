export function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0 ? (ordered[middle - 1] + ordered[middle]) / 2 : ordered[middle];
}

export function percentile(values: readonly number[], percentileValue: number): number | null {
  if (values.length === 0) {
    return null;
  }
  if (!(percentileValue > 0 && percentileValue <= 1)) {
    throw new Error("Percentile must be greater than zero and at most one");
  }
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(percentileValue * ordered.length) - 1);
  return ordered[index];
}

export function observedCpk(
  values: readonly number[],
  lowerSpecificationLimit: number,
  upperSpecificationLimit: number,
): number | null {
  if (values.length < 30 || upperSpecificationLimit <= lowerSpecificationLimit) {
    return null;
  }
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1);
  const standardDeviation = Math.sqrt(variance);
  if (!Number.isFinite(standardDeviation) || standardDeviation === 0) {
    return null;
  }
  return Math.min(
    (upperSpecificationLimit - mean) / (3 * standardDeviation),
    (mean - lowerSpecificationLimit) / (3 * standardDeviation),
  );
}

export function distanceBeyondLimit(value: number, minimum: number, maximum: number): number {
  if (value < minimum) {
    return value - minimum;
  }
  if (value > maximum) {
    return value - maximum;
  }
  return 0;
}
