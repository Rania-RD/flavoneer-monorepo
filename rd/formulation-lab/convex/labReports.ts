import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { makeLocalizedString, selectLocalizedString } from "./localization";
import {
  enrichedLabReportReturnValidator,
  labReportStatusValidator,
  languageValidator,
  localizedStringValidator,
  signatureTypeValidator,
} from "./validators";

async function enrichReport(
  ctx: QueryCtx,
  report: Doc<"labReports">,
  language?: string
) {
  let projectName = selectLocalizedString(
    report.projectName,
    report.projectNameI18n,
    language
  );
  let projectNameI18n = makeLocalizedString(
    report.projectName,
    report.projectNameI18n
  );

  try {
    const project = await ctx.db.get(report.projectId);
    if (project) {
      projectName = selectLocalizedString(
        project.name,
        project.nameI18n,
        language
      );
      projectNameI18n = makeLocalizedString(project.name, project.nameI18n);
    }
  } catch {
    // Keep report-level fallback for legacy data.
  }

  const resultDocs = await ctx.db
    .query("labTestResults")
    .withIndex("by_labReportId", (q) => q.eq("labReportId", report._id))
    .collect();

  const results = resultDocs
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((result) => ({
      parameter: selectLocalizedString(
        result.parameter,
        result.parameterI18n,
        language
      ),
      parameterI18n: makeLocalizedString(
        result.parameter,
        result.parameterI18n
      ),
      method: selectLocalizedString(result.method, result.methodI18n, language),
      methodI18n: makeLocalizedString(result.method, result.methodI18n),
      targetRange: selectLocalizedString(
        result.targetRange,
        result.targetRangeI18n,
        language
      ),
      targetRangeI18n: makeLocalizedString(
        result.targetRange,
        result.targetRangeI18n
      ),
      min: result.min,
      max: result.max,
      actualValue: result.actualValue,
      unit: result.unit,
    }));

  return {
    ...report,
    projectName,
    projectNameI18n,
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
    language: v.optional(languageValidator),
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
      result.page.map((report) => enrichReport(ctx, report, args.language))
    );
    return { ...result, page };
  },
});

export const get = query({
  args: { id: v.id("labReports"), language: v.optional(languageValidator) },
  returns: v.union(enrichedLabReportReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) {
      return null;
    }
    return enrichReport(ctx, report, args.language);
  },
});

export const getByProject = query({
  args: {
    projectId: v.id("projects"),
    language: v.optional(languageValidator),
  },
  returns: v.array(enrichedLabReportReturnValidator),
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("labReports")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
    return Promise.all(
      reports.map((report) => enrichReport(ctx, report, args.language))
    );
  },
});

export const create = mutation({
  args: {
    reportId: v.string(),
    runId: v.id("runs"),
    projectId: v.id("projects"),
    projectName: v.optional(v.string()),
    projectNameI18n: v.optional(localizedStringValidator),
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
        parameterI18n: v.optional(localizedStringValidator),
        method: v.string(),
        methodI18n: v.optional(localizedStringValidator),
        targetRange: v.string(),
        targetRangeI18n: v.optional(localizedStringValidator),
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
    const project = await ctx.db.get(args.projectId);
    const projectName = args.projectName ?? project?.name;
    const projectNameI18n = makeLocalizedString(
      projectName,
      args.projectNameI18n ?? project?.nameI18n
    );

    const reportId = await ctx.db.insert("labReports", {
      ...reportData,
      projectName,
      projectNameI18n,
    });

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      await ctx.db.insert("labTestResults", {
        labReportId: reportId,
        sortOrder: i,
        ...result,
        parameterI18n: makeLocalizedString(
          result.parameter,
          result.parameterI18n
        ),
        methodI18n: makeLocalizedString(result.method, result.methodI18n),
        targetRangeI18n: makeLocalizedString(
          result.targetRange,
          result.targetRangeI18n
        ),
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
    const results = await ctx.db
      .query("labTestResults")
      .withIndex("by_labReportId", (q) => q.eq("labReportId", args.id))
      .collect();
    for (const result of results) {
      await ctx.db.delete(result._id);
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
