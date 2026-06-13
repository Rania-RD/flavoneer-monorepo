import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Clears ALL application tables, preserving BetterAuth tables
 * (which live in a separate component namespace).
 *
 * Run via:  npx convex run clearAllAppTables:run
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
  "teams",
  "teamMembers",
  "teamInvites",
  "teamAuditLogs",
  "materialUsageLogs",
  "runPhases",
  "runSteps",
  "projectVersions",
  "foodCategories",
  "foodAdditives",
  "additiveLimits",
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
