import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import {
  type CleanupBatchResult,
  INSPECTION_BATCH_HOURS,
  type PreparedSeed,
  type SeedResult,
  seedResultValidator,
} from "./e2eQualityReportSeed";
import { DEMO_INSPECTION_COUNT, DEMO_WEEK_HOURS } from "./e2eQualityReportSeedSchedule";

const HOUR_MS = 60 * 60 * 1000;

export const seedQualityReports = internalAction({
  args: {
    organizationName: v.string(),
    confirmation: v.literal("seed-e2e-qc-reporting-demo"),
  },
  returns: seedResultValidator,
  handler: async (ctx, args): Promise<SeedResult> => {
    const now = Date.now();
    const existing: SeedResult | null = await ctx.runQuery(
      internal.e2eQualityReportSeed.getExistingSeed,
      { ...args, now },
    );
    if (existing) {
      return existing;
    }

    const staleStorageIds = new Set<CleanupBatchResult["storageIds"][number]>();
    while (true) {
      const cleanup: CleanupBatchResult = await ctx.runMutation(
        internal.e2eQualityReportSeed.removeQualityReportRecordsBatch,
        args,
      );
      for (const storageId of cleanup.storageIds) {
        staleStorageIds.add(storageId);
      }
      if (cleanup.removed === 0) {
        break;
      }
    }

    const evidenceImage = await ctx.storage.store(
      new Blob(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#173e33"/><rect x="36" y="36" width="568" height="288" rx="24" fill="#fffdf4"/><text x="320" y="170" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#173e33">QC DEMO BATCH</text><text x="320" y="220" text-anchor="middle" font-family="monospace" font-size="26" fill="#a36a12">HOURLY CHECK</text></svg>',
        ],
        { type: "image/svg+xml" },
      ),
    );
    const prepared: PreparedSeed = await ctx.runMutation(
      internal.e2eQualityReportSeed.prepareQualityReports,
      { ...args, now, staleStorageIds: [...staleStorageIds] },
    );
    const newestHour = Math.floor(now / HOUR_MS) * HOUR_MS;
    const firstHour = newestHour - (DEMO_WEEK_HOURS - 1) * HOUR_MS;
    let inserted = 0;
    for (let startHourIndex = 0; startHourIndex < DEMO_WEEK_HOURS; ) {
      const endHourIndex = Math.min(startHourIndex + INSPECTION_BATCH_HOURS, DEMO_WEEK_HOURS);
      const batchCount: number = await ctx.runMutation(
        internal.e2eQualityReportSeed.seedQualityReportHours,
        {
          organizationId: prepared.organizationId,
          evidenceImage,
          firstHour,
          startHourIndex,
          endHourIndex,
          products: prepared.products,
        },
      );
      inserted += batchCount;
      startHourIndex = endHourIndex;
    }
    if (inserted !== DEMO_INSPECTION_COUNT) {
      throw new Error(
        `Expected ${DEMO_INSPECTION_COUNT} demo inspections but inserted ${inserted}`,
      );
    }

    const result: SeedResult = await ctx.runMutation(
      internal.e2eQualityReportSeed.finishQualityReports,
      {
        organizationId: prepared.organizationId,
        firstHour,
        now,
        products: prepared.products,
      },
    );
    return result;
  },
});
