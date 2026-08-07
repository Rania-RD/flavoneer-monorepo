export type HallCode = "A" | "B";

export type ReadingKey =
  | "pour_weight"
  | "additive_weight"
  | "chocolate_temperature"
  | "coated_piece_weight"
  | "carton_weight";

export type Unit = "mg" | "g" | "kg" | "°C";

export interface LimitDraft {
  maximum: string;
  minimum: string;
  minimumReadingCount: string;
  target: string;
  unit: Unit;
}

export const readingKeys: ReadingKey[] = [
  "pour_weight",
  "additive_weight",
  "chocolate_temperature",
  "coated_piece_weight",
  "carton_weight",
];

export const emptyLimits = (): Record<ReadingKey, LimitDraft> => ({
  pour_weight: {
    minimum: "",
    maximum: "",
    target: "",
    minimumReadingCount: "1",
    unit: "g",
  },
  additive_weight: {
    minimum: "",
    maximum: "",
    target: "",
    minimumReadingCount: "1",
    unit: "g",
  },
  chocolate_temperature: {
    minimum: "",
    maximum: "",
    target: "",
    minimumReadingCount: "1",
    unit: "°C",
  },
  coated_piece_weight: {
    minimum: "",
    maximum: "",
    target: "",
    minimumReadingCount: "1",
    unit: "g",
  },
  carton_weight: {
    minimum: "",
    maximum: "",
    target: "",
    minimumReadingCount: "1",
    unit: "kg",
  },
});
