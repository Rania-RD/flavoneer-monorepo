import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { type SeedResult, seedResultValidator } from "./e2eQualityReportSeed";

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

    const evidenceImage = await ctx.storage.store(
      new Blob(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#173e33"/><rect x="36" y="36" width="568" height="288" rx="24" fill="#fffdf4"/><text x="320" y="170" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#173e33">QC DEMO BATCH</text><text x="320" y="220" text-anchor="middle" font-family="monospace" font-size="26" fill="#a36a12">HOURLY CHECK</text></svg>',
        ],
        { type: "image/svg+xml" },
      ),
    );
    const result: SeedResult = await ctx.runMutation(
      internal.e2eQualityReportSeed.seedQualityReports,
      {
        ...args,
        evidenceImage,
        now,
      },
    );
    return result;
  },
});
