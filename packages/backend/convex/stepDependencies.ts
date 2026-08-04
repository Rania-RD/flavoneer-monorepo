import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all dependencies for a project
export const getByProject = query({
  args: { projectId: v.id("projects") },
  returns: v.array(
    v.object({
      _id: v.id("stepDependencies"),
      _creationTime: v.number(),
      projectId: v.id("projects"),
      stepKey: v.string(),
      dependsOnStepKeys: v.array(v.string()),
      condition: v.union(v.literal("AND"), v.literal("OR")),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stepDependencies")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

// Save or update a dependency for a step
export const saveDependency = mutation({
  args: {
    projectId: v.id("projects"),
    stepKey: v.string(),
    dependsOnStepKeys: v.array(v.string()),
    condition: v.union(v.literal("AND"), v.literal("OR")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if dependency already exists for this step
    const sameStepDependencies = await ctx.db
      .query("stepDependencies")
      .withIndex("by_stepKey", (q) => q.eq("stepKey", args.stepKey))
      .collect();
    const existing = sameStepDependencies.find(
      (dependency) => dependency.projectId === args.projectId
    );

    if (existing) {
      // If empty array, we can either delete or just clear it. Let's delete it so we don't pollute the DB
      if (args.dependsOnStepKeys.length === 0) {
        await ctx.db.delete(existing._id);
      } else {
        await ctx.db.patch(existing._id, {
          dependsOnStepKeys: args.dependsOnStepKeys,
          condition: args.condition,
        });
      }
    } else {
      // Create new dependency if keys exist
      if (args.dependsOnStepKeys.length > 0) {
        await ctx.db.insert("stepDependencies", {
          projectId: args.projectId,
          stepKey: args.stepKey,
          dependsOnStepKeys: args.dependsOnStepKeys,
          condition: args.condition,
        });
      }
    }
    return null;
  },
});
