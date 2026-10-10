import { describe, expect, test } from "vitest";
import type { Doc, Id } from "./_generated/dataModel";
import { buildFloorLines } from "./productionFloor";

function summary(
  overrides: Partial<Doc<"qualityInspectionSummaries">>,
): Doc<"qualityInspectionSummaries"> {
  return {
    _id: "summary" as Id<"qualityInspectionSummaries">,
    _creationTime: 100,
    organizationId: "organization" as Id<"organizations">,
    recordId: "record" as Id<"productionLineRecords">,
    inspectionAt: 100,
    dayKey: "2026-08-24",
    productId: "project" as Id<"projects">,
    productName: "Icy Lemon",
    productionHallCode: "A",
    departmentName: "Rollo A",
    specificationId: "specification" as Id<"productionLineSpecifications">,
    specificationVersion: 1,
    qcUserId: "quality-officer",
    qcUserName: "Quality Officer",
    editableOwnerUserId: "quality-officer",
    displaySerial: "A-100",
    status: "approved",
    createdAt: 100,
    updatedAt: 100,
    returnedCount: 0,
    totalReadingCount: 4,
    withinLimitReadingCount: 4,
    outOfLimitReadingCount: 0,
    outOfLimitReadingKeys: [],
    hasBatchLabelPhoto: true,
    hasConfirmedBatchCode: true,
    completedCheckCount: 22,
    requiredCheckCount: 22,
    completedReadingRequirementCount: 4,
    requiredReadingRequirementCount: 4,
    ...overrides,
  };
}

describe("production floor overview", () => {
  test("uses the latest inspection for status and the selected window for statistics", () => {
    const rows = [
      summary({
        _id: "latest-summary" as Id<"qualityInspectionSummaries">,
        recordId: "latest-record" as Id<"productionLineRecords">,
        inspectionAt: 300,
        displaySerial: "A-300",
        status: "pending_production_review",
        outOfLimitReadingCount: 1,
        outOfLimitReadingKeys: ["pour_weight"],
      }),
      summary({
        _id: "approved-summary" as Id<"qualityInspectionSummaries">,
        recordId: "approved-record" as Id<"productionLineRecords">,
        inspectionAt: 250,
        displaySerial: "A-250",
      }),
      summary({
        _id: "old-summary" as Id<"qualityInspectionSummaries">,
        recordId: "old-record" as Id<"productionLineRecords">,
        inspectionAt: 50,
        displaySerial: "A-050",
      }),
    ];

    expect(buildFloorLines(rows, 200)).toEqual([
      expect.objectContaining({
        departmentName: "Rollo A",
        status: "attention",
        latestInspection: expect.objectContaining({
          recordId: "latest-record",
          displaySerial: "A-300",
        }),
        statistics: {
          inspections: 2,
          approved: 1,
          pending: 1,
          returned: 0,
          outOfLimit: 1,
          conformanceRate: 0.5,
        },
      }),
    ]);
  });
});
