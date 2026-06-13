import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import {
  enrichedLabReportReturnValidator,
  labReportStatusValidator,
  signatureTypeValidator,
} from "./validators";

// ── Enrichment: resolve projectName + join test results ──
async function enrichReport(ctx: QueryCtx, report: Doc<"labReports">) {
  let projectName = "";
  try {
    const project = await ctx.db.get(report.projectId);
    projectName = project?.name ?? "";
  } catch {
    projectName = report.projectName ?? "";
  }

  // Join test results from labTestResults table
  const resultDocs = await ctx.db
    .query("labTestResults")
    .withIndex("by_labReportId", (q) => q.eq("labReportId", report._id))
    .collect();

  const results = resultDocs
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({
      parameter: r.parameter,
      method: r.method,
      targetRange: r.targetRange,
      min: r.min,
      max: r.max,
      actualValue: r.actualValue,
      unit: r.unit,
    }));

  return {
    ...report,
    projectName,
    results,
    signoffData: report.signoffData,
    signoffFont: report.signoffFont,
    signoffType: report.signoffType,
  };
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(labReportStatusValidator),
  },
  handler: async (ctx, args) => {
    let result: {
      page: Doc<"labReports">[];
      isDone: boolean;
      continueCursor: string;
    };
    if (args.status) {
      result = await ctx.db
        .query("labReports")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db.query("labReports").paginate(args.paginationOpts);
    }
    const page = await Promise.all(
      result.page.map((r) => enrichReport(ctx, r))
    );
    return { ...result, page };
  },
});

export const get = query({
  args: { id: v.id("labReports") },
  returns: v.union(enrichedLabReportReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) {
      return null;
    }
    return enrichReport(ctx, report);
  },
});

export const getByProject = query({
  args: { projectId: v.id("projects") },
  returns: v.array(enrichedLabReportReturnValidator),
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("labReports")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
    return Promise.all(reports.map((r) => enrichReport(ctx, r)));
  },
});

export const create = mutation({
  args: {
    reportId: v.string(),
    runId: v.id("runs"),
    projectId: v.id("projects"),
    version: v.string(),
    lotNumber: v.string(),
    date: v.string(),
    status: labReportStatusValidator,
    leadChemist: v.string(),
    sampleType: v.string(),
    hash: v.string(),
    results: v.array(
      v.object({
        parameter: v.string(),
        method: v.string(),
        targetRange: v.string(),
        min: v.number(),
        max: v.number(),
        actualValue: v.number(),
        unit: v.string(),
      })
    ),
    signoffData: v.optional(v.string()),
    signoffFont: v.optional(v.string()),
    signoffType: v.optional(signatureTypeValidator),
  },
  returns: v.id("labReports"),
  handler: async (ctx, args) => {
    const { results, ...reportData } = args;

    // Insert the report row
    const reportId = await ctx.db.insert("labReports", reportData);

    // Insert test results into labTestResults table
    for (let i = 0; i < results.length; i++) {
      await ctx.db.insert("labTestResults", {
        labReportId: reportId,
        sortOrder: i,
        ...results[i],
      });
    }

    return reportId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("labReports"),
    status: labReportStatusValidator,
    signoffData: v.optional(v.string()),
    signoffFont: v.optional(v.string()),
    signoffType: v.optional(signatureTypeValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, status, signoffData, signoffFont, signoffType } = args;
    await ctx.db.patch(id, {
      status,
      ...(signoffData !== undefined && { signoffData }),
      ...(signoffFont !== undefined && { signoffFont }),
      ...(signoffType !== undefined && { signoffType }),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("labReports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Cascade: delete test results
    const results = await ctx.db
      .query("labTestResults")
      .withIndex("by_labReportId", (q) => q.eq("labReportId", args.id))
      .collect();
    for (const r of results) {
      await ctx.db.delete(r._id);
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
