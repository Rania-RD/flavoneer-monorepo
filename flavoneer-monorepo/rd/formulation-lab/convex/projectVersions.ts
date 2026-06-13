import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { projectVersionReturnValidator } from "./validators";

type RecipeStepType =
  | "weighing"
  | "timer"
  | "process"
  | "critical_check"
  | "conditional"
  | "spreadsheet_note";

export const list = query({
  args: { projectId: v.id("projects") },
  returns: v.array(projectVersionReturnValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projectVersions")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    version: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Snapshot ingredients
    const ingredients = await ctx.db
      .query("projectIngredients")
      .withIndex("by_projectId_versionTag", (q) =>
        q.eq("projectId", args.projectId).eq("versionTag", "current")
      )
      .collect();

    // Snapshot phases
    const phases = await ctx.db
      .query("recipePhases")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    const phasesWithSteps = await Promise.all(
      phases.map(async (phase) => {
        const steps = await ctx.db
          .query("recipeSteps")
          .withIndex("by_phaseId", (q) => q.eq("phaseId", phase._id))
          .collect();
        return {
          ...phase,
          steps,
        };
      })
    );

    // Create the version record
    const { _id, _creationTime, ...projectData } = project;
    await ctx.db.insert("projectVersions", {
      projectId: args.projectId,
      version: args.version,
      name: args.name,
      data: projectData,
      ingredients,
      phases: phasesWithSteps,
      createdAt: Date.now(),
      createdBy: authUser._id,
    });

    // Update project version string
    await ctx.db.patch(args.projectId, {
      version: args.version,
    });
    return null;
  },
});

export const restore = mutation({
  args: {
    projectId: v.id("projects"),
    versionId: v.id("projectVersions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const versionRecord = await ctx.db.get(args.versionId);
    if (!versionRecord) {
      throw new Error("Version not found");
    }
    if (versionRecord.projectId !== args.projectId) {
      throw new Error("Version does not belong to this project");
    }

    // 1. Restore Project Data
    const {
      description,
      category,
      gsfaCategoryCode,
      gsfaCategoryName,
      productType,
      processingMethod,
      targetOutcome,
      nutritionalGoal,
      testingRequirements,
      processingTemp,
      processingTime,
      targetTexture,
    } = versionRecord.data;

    await ctx.db.patch(args.projectId, {
      description,
      category,
      gsfaCategoryCode,
      gsfaCategoryName,
      productType,
      processingMethod,
      targetOutcome,
      nutritionalGoal,
      testingRequirements,
      processingTemp,
      processingTime,
      targetTexture,
      version: versionRecord.version,
    });

    // 2. Restore Ingredients
    // Delete current
    const currentIngs = await ctx.db
      .query("projectIngredients")
      .withIndex("by_projectId_versionTag", (q) =>
        q.eq("projectId", args.projectId).eq("versionTag", "current")
      )
      .collect();
    for (const ing of currentIngs) {
      await ctx.db.delete(ing._id);
    }

    // Insert from snapshot
    for (const ing of versionRecord.ingredients) {
      const { _id, _creationTime, projectId, ...ingData } = ing;
      await ctx.db.insert("projectIngredients", {
        ...ingData,
        projectId: args.projectId,
        versionTag: "current", // Make it current
      });
    }

    // 3. Restore Phases & Steps
    // Delete current
    const currentPhases = await ctx.db
      .query("recipePhases")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const phase of currentPhases) {
      const steps = await ctx.db
        .query("recipeSteps")
        .withIndex("by_phaseId", (q) => q.eq("phaseId", phase._id))
        .collect();
      for (const step of steps) {
        await ctx.db.delete(step._id);
      }
      await ctx.db.delete(phase._id);
    }

    // Insert from snapshot
    for (const phaseSnapshot of versionRecord.phases) {
      const { steps, _id, _creationTime, projectId, ...phaseData } =
        phaseSnapshot;

      const newPhaseId = await ctx.db.insert("recipePhases", {
        ...phaseData,
        projectId: args.projectId,
      });

      for (const stepSnapshot of steps) {
        const { _id, _creationTime, phaseId, projectId, ...stepData } =
          stepSnapshot;
        await ctx.db.insert("recipeSteps", {
          ...stepData,
          type: stepData.type as RecipeStepType,
          phaseId: newPhaseId,
          projectId: args.projectId,
        });
      }
    }
    return null;
  },
});

export const getNextVersion = query({
  args: { projectId: v.id("projects") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }

    if (!project.teamId) {
      return null;
    }

    const team = await ctx.db.get(project.teamId);
    if (!(team && team.autoVersioning)) {
      return null;
    }

    const currentVersion = project.version;
    // Simple increment logic
    const match = currentVersion.match(/(\d+)$/);
    if (match) {
      const numberPart = match[1];
      const prefix = currentVersion.slice(0, match.index);
      const nextNumber = Number.parseInt(numberPart) + 1;
      return `${prefix}${nextNumber}`;
    }

    // Fallback if no number found
    return `${currentVersion}.1`;
  },
});
