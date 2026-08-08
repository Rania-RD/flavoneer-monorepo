import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Clears ALL application tables, preserving BetterAuth tables
 * (which live in a separate component namespace).
 *
 * Run via: pnpm --filter @flavoneer/backend exec convex run clearAllAppTables:run
 */

const APP_TABLES = [
  "projects",
  "projectIngredients",
  "recipePhases",
  "recipeSteps",
  "labTestResults",
  "inventoryItems",
  "labReports",
  "equipment",
  "runs",
  "userSettings",
  "organizations",
  "organizationMembers",
  "organizationInvites",
  "organizationAuditLogs",
  "materialUsageLogs",
  "runPhases",
  "runSteps",
  "projectVersions",
  "foodCategories",
  "foodAdditives",
  "additiveLimits",
  "productionLineRecordEvents",
  "productionLineChecks",
  "productionLineReadings",
  "productionLineRecords",
  "productionLineSpecificationLimits",
  "productionLineSpecifications",
  "productionLineSerialCounters",
  "productionLineSettings",
] as const;

export const run = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    for (const table of APP_TABLES) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      console.log(`Cleared ${table}: ${docs.length} documents deleted`);
    }
    console.log("✅ All app tables cleared");
  },
});
