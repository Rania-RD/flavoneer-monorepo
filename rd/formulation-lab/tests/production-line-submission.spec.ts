import {
  getProductionLineSubmissionReadiness,
  PRODUCTION_LINE_CHECK_KEYS,
  PRODUCTION_LINE_READING_KEYS,
} from "@flavoneer/backend/production-line";
import { expect, test } from "@playwright/test";

type SubmissionSnapshot = Parameters<
  typeof getProductionLineSubmissionReadiness
>[0];

function completeSubmission(): SubmissionSnapshot {
  return {
    checks: PRODUCTION_LINE_CHECK_KEYS.map((checkKey) => ({
      checkKey,
      checked: true,
    })),
    hasBatchLabelPhoto: true,
    hasConfirmedBatchCode: true,
    limits: PRODUCTION_LINE_READING_KEYS.map((readingKey) => ({
      minimumReadingCount: readingKey === "pour_weight" ? 2 : 1,
      readingKey,
    })),
    readings: PRODUCTION_LINE_READING_KEYS.flatMap((readingKey) =>
      Array.from(
        { length: readingKey === "pour_weight" ? 2 : 1 },
        (_, index) => ({
          readingIndex: index + 1,
          readingKey,
          value: 10,
        })
      )
    ),
  };
}

test.describe("production-line submission readiness", () => {
  test("accepts a form with confirmed evidence, required readings, and all checks", () => {
    expect(getProductionLineSubmissionReadiness(completeSubmission())).toEqual({
      isReady: true,
      missingRequirements: [],
    });
  });

  test("reports every incomplete submission section", () => {
    const snapshot = completeSubmission();
    snapshot.hasBatchLabelPhoto = false;
    snapshot.hasConfirmedBatchCode = false;
    snapshot.readings = snapshot.readings.filter(
      (reading) =>
        !(reading.readingKey === "pour_weight" && reading.readingIndex === 2)
    );
    snapshot.checks = snapshot.checks.filter(
      (check) => check.checkKey !== "packaging"
    );

    expect(getProductionLineSubmissionReadiness(snapshot)).toEqual({
      isReady: false,
      missingRequirements: [
        "batch_label_photo",
        "batch_code_confirmation",
        "required_measurements",
        "compliance_checks",
      ],
    });
  });

  test("requires each configured reading index instead of accepting an unrelated reading", () => {
    const snapshot = completeSubmission();
    snapshot.readings = snapshot.readings
      .filter(
        (reading) =>
          !(reading.readingKey === "pour_weight" && reading.readingIndex === 2)
      )
      .concat({ readingIndex: 99, readingKey: "pour_weight", value: 10 });

    expect(getProductionLineSubmissionReadiness(snapshot)).toMatchObject({
      isReady: false,
      missingRequirements: ["required_measurements"],
    });
  });

  test("requires the complete five-measurement specification", () => {
    const snapshot = completeSubmission();
    snapshot.limits = snapshot.limits.filter(
      (limit) => limit.readingKey !== "chocolate_temperature"
    );

    expect(getProductionLineSubmissionReadiness(snapshot)).toMatchObject({
      isReady: false,
      missingRequirements: ["required_measurements"],
    });
  });
});
