import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePersonalOrWorkspaceAccess } from "./workspaceAccess";

// ─── Queries ───────────────────────────────────────────────

export const getFormByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const form = await ctx.db
      .query("sensoryForms")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!form) {
      return null;
    }

    return form;
  },
});

export const getFormByRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      throw new Error("Run not found");
    }
    await requirePersonalOrWorkspaceAccess(ctx, run);

    const form = await ctx.db
      .query("sensoryForms")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .first();

    return form;
  },
});

export const getEvaluationsByForm = query({
  args: { formId: v.id("sensoryForms") },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) {
      throw new Error("Sensory form not found");
    }
    const run = await ctx.db.get(form.runId);
    if (!run) {
      throw new Error("Run not found");
    }
    await requirePersonalOrWorkspaceAccess(ctx, run);

    const evaluations = await ctx.db
      .query("sensoryEvaluations")
      .withIndex("by_formId", (q) => q.eq("formId", args.formId))
      .collect();

    return evaluations;
  },
});

// ─── Mutations ─────────────────────────────────────────────

export const createForm = mutation({
  args: {
    projectId: v.id("projects"),
    runId: v.id("runs"),
    name: v.string(),
    schemaJSON: v.string(),
  },
  handler: async (ctx, args) => {
    const [project, run] = await Promise.all([
      ctx.db.get(args.projectId),
      ctx.db.get(args.runId),
    ]);
    if (!project) {
      throw new Error("Project not found");
    }
    if (!run || run.projectId !== project._id) {
      throw new Error("Run does not belong to this project");
    }
    const authUser = await requirePersonalOrWorkspaceAccess(ctx, project);
    await requirePersonalOrWorkspaceAccess(ctx, run);

    // Generate a simple secure random string token for the URL
    const token = crypto.randomUUID().replace(/-/g, "");

    const formId = await ctx.db.insert("sensoryForms", {
      projectId: args.projectId,
      runId: args.runId,
      name: args.name,
      schemaJSON: args.schemaJSON,
      token,
      createdAt: Date.now(),
      createdBy: authUser._id,
    });

    return { formId, token };
  },
});

export const submitEvaluation = mutation({
  args: {
    token: v.string(),
    testerName: v.string(),
    resultsJSON: v.string(),
  },
  handler: async (ctx, args) => {
    // The high-entropy form token is the capability for this intentional
    // anonymous endpoint. A raw Convex document ID is not sufficient.
    const form = await ctx.db
      .query("sensoryForms")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!form) {
      throw new Error("Form not found");
    }

    await ctx.db.insert("sensoryEvaluations", {
      formId: form._id,
      testerName: args.testerName,
      resultsJSON: args.resultsJSON,
      createdAt: Date.now(),
    });

    return true;
  },
});
