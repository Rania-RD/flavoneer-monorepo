import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    // Basic auth check for accessing internal batch data
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

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
    // Basic auth check for accessing evaluation reports
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Generate a simple secure random string token for the URL
    const token = crypto.randomUUID().replace(/-/g, "").substring(0, 16);

    const formId = await ctx.db.insert("sensoryForms", {
      projectId: args.projectId,
      runId: args.runId,
      name: args.name,
      schemaJSON: args.schemaJSON,
      token,
      createdAt: Date.now(),
      createdBy: identity.subject,
    });

    return { formId, token };
  },
});

export const submitEvaluation = mutation({
  args: {
    formId: v.id("sensoryForms"),
    testerName: v.string(),
    resultsJSON: v.string(),
  },
  handler: async (ctx, args) => {
    // Note: No auth check here. This allows testers to submit publicly.
    const form = await ctx.db.get(args.formId);
    if (!form) {
      throw new Error("Form not found");
    }

    await ctx.db.insert("sensoryEvaluations", {
      formId: args.formId,
      testerName: args.testerName,
      resultsJSON: args.resultsJSON,
      createdAt: Date.now(),
    });

    return true;
  },
});
