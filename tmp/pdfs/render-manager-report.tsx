import { writeFile } from "node:fs/promises";
import { pdf } from "../../rd/formulation-lab/node_modules/@react-pdf/renderer/lib/react-pdf.js";
import React from "../../rd/formulation-lab/node_modules/react/index.js";
import { QualityManagerReportPdf } from "../../rd/formulation-lab/components/quality-reports/manager-report-pdf";

const now = Date.now();
const exceptions = Array.from({ length: 16 }, (_, index) => ({
  displaySerial: `QC-2026-${String(index + 1).padStart(3, "0")}`,
  productName: ["Twin", "Rocky", "Daymeh", "Icy Lemon"][index % 4],
  outOfLimitReadingCount: index % 3,
  status: index % 2 ? "pending_production_review" : "returned",
}));
const stalledRecords = Array.from({ length: 12 }, (_, index) => ({
  displaySerial: `QC-2026-${String(index + 20).padStart(3, "0")}`,
  productName: ["Twin", "Rocky", "Daymeh"][index % 3],
  missing: ["batchLabelPhoto", "requiredMeasurements"],
  ageMs: (index + 1) * 3_600_000,
}));
const groups = ["Twin", "Rocky", "Daymeh", "Icy Lemon"].map(
  (label, index) => ({
    label,
    inspections: 24 - index * 2,
    outOfLimitRecords: index,
    outOfLimitRate: index / 20,
    readingConformanceRate: 0.98 - index / 100,
    firstPassApprovalRate: 0.91 - index / 20,
  })
);
const inspectors = ["Ameer", "Qusai", "Shaima", "Rania"].map(
  (name, index) => ({
    name,
    assigned: 18 - index,
    submitted: 16 - index,
    returned: index,
    firstPassApprovalRate: 0.9 - index / 20,
  })
);
const reviewers = ["Maya", "Omar", "Rana"].map((name, index) => ({
  name,
  decisions: 22 - index,
  approvals: 20 - index,
  returns: index + 1,
  medianReviewTimeMs: (index + 1) * 1_800_000,
}));

const report = {
  overview: {
    totals: {
      inspections: 86,
      approved: 70,
      pending: 7,
      returned: 5,
      outOfLimitRecords: 4,
    },
    exceptions,
  },
  readiness: {
    totals: {
      openRecords: 12,
      photoCoverage: 0.83,
      codeCoverage: 0.92,
      readingCoverage: 0.88,
      checkCoverage: 0.96,
      oldestStalledAgeMs: 43_200_000,
    },
    missingRequirements: {
      batchLabelPhoto: 2,
      batchCodeConfirmation: 1,
      requiredMeasurements: 3,
      complianceChecks: 1,
    },
    stalledRecords,
  },
  comparison: {
    baseline: {
      readingConformanceRate: 0.972,
      firstPassApprovalRate: 0.89,
    },
    groups,
  },
  workflow: {
    totals: { medianReviewTimeMs: 2_700_000 },
    inspectors,
    reviewers,
  },
} as never;

const laboratory = {
  totals: {
    reports: 28,
    testConformanceRate: 0.984,
    sampleCoverageRate: 0.94,
    unreportedSamples: 2,
  },
  recentReports: Array.from({ length: 12 }, (_, index) => ({
    reportId: `QC-DEMO-${String(index + 1).padStart(3, "0")}`,
    productName: ["Twin", "Rocky", "Daymeh", "Icy Lemon"][index % 4],
    lotNumber: `LOT-${202600 + index}`,
    status: index % 5 ? "Approved" : "Failed",
    outOfSpecTestCount: index % 5 ? 0 : 1,
  })),
} as never;

async function renderReport() {
  const blob = await pdf(
    React.createElement(QualityManagerReportPdf, {
      from: now - 29 * 86_400_000,
      generatedAt: now,
      groupBy: "product",
      laboratory,
      language: "en",
      locale: "en",
      report,
      timezone: "Asia/Gaza",
      to: now,
    })
  ).toBlob();

  await writeFile(
    "tmp/pdfs/qc-manager-report-qa.pdf",
    Buffer.from(await blob.arrayBuffer())
  );
}

renderReport().catch((error: unknown) => {
  throw error;
});
