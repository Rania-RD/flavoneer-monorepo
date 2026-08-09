import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { makeLocalizedString, selectLocalizedString } from "./localization";
import { requirePermission } from "./permissions";
import {
  enrichedLabReportReturnValidator,
  labReportStatusValidator,
  languageValidator,
  localizedStringValidator,
} from "./validators";
import {
  requirePersonalOrWorkspaceAccess,
  requirePersonalOrWorkspaceScope,
} from "./workspaceAccess";

async function enrichReport(ctx: QueryCtx, report: Doc<"labReports">, language?: string) {
  let projectName = selectLocalizedString(report.projectName, report.projectNameI18n, language);
  let projectNameI18n = makeLocalizedString(report.projectName, report.projectNameI18n);

  try {
    const project = await ctx.db.get(report.projectId);
    if (project) {
      projectName = selectLocalizedString(project.name, project.nameI18n, language);
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
      parameter: selectLocalizedString(result.parameter, result.parameterI18n, language),
      parameterI18n: makeLocalizedString(result.parameter, result.parameterI18n),
      method: selectLocalizedString(result.method, result.methodI18n, language),
      methodI18n: makeLocalizedString(result.method, result.methodI18n),
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
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const scope = await requirePersonalOrWorkspaceScope(ctx, args.organizationId);
    const result: {
      page: Doc<"labReports">[];
      isDone: boolean;
      continueCursor: string;
    } = await ctx.db
      .query("labReports")
      .filter((q) => {
        const scopeFilter = scope.organizationId
          ? q.eq(q.field("organizationId"), scope.organizationId)
          : q.and(
              q.eq(q.field("organizationId"), undefined),
              q.eq(q.field("userId"), scope.userId),
            );
        return args.status ? q.and(scopeFilter, q.eq(q.field("status"), args.status)) : scopeFilter;
      })
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map((report) => enrichReport(ctx, report, args.language)),
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
    await requirePersonalOrWorkspaceAccess(ctx, report);
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
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    await requirePersonalOrWorkspaceAccess(ctx, project);
    const reports = await ctx.db
      .query("labReports")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
    return Promise.all(reports.map((report) => enrichReport(ctx, report, args.language)));
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
    sampleType: v.string(),
    hash: v.string(),
    results: v.array(
      v.object({
        parameter: v.string(),
        parameterI18n: v.optional(localizedStringValidator),
        method: v.string(),
        methodI18n: v.optional(localizedStringValidator),
        min: v.number(),
        max: v.number(),
        actualValue: v.number(),
        unit: v.string(),
      }),
    ),
  },
  returns: v.id("labReports"),
  handler: async (ctx, args) => {
    const { results, ...reportData } = args;
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    const run = await ctx.db.get(args.runId);
    if (!run || run.projectId !== project._id) {
      throw new Error("Run does not belong to this project");
    }
    const authUser = await requirePersonalOrWorkspaceAccess(ctx, project);
    await requirePersonalOrWorkspaceAccess(ctx, run);
    if (
      (run.organizationId ?? undefined) !== (project.organizationId ?? undefined) ||
      (!project.organizationId && run.userId !== project.userId)
    ) {
      throw new Error("Run belongs to a different workspace");
    }

    const projectName = args.projectName ?? project.name;
    const projectNameI18n = makeLocalizedString(
      projectName,
      args.projectNameI18n ?? project?.nameI18n,
    );

    const reportId = await ctx.db.insert("labReports", {
      ...reportData,
      projectName,
      projectNameI18n,
      status: "Pending",
      leadChemist: authUser.name?.trim() || authUser.email?.trim() || "Unknown user",
      userId: authUser._id,
      organizationId: project.organizationId || undefined,
    });

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      await ctx.db.insert("labTestResults", {
        labReportId: reportId,
        sortOrder: i,
        ...result,
        parameterI18n: makeLocalizedString(result.parameter, result.parameterI18n),
        methodI18n: makeLocalizedString(result.method, result.methodI18n),
      });
    }

    return reportId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("labReports"),
    status: labReportStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) {
      throw new Error("Lab report not found");
    }
    const authUser = await requirePersonalOrWorkspaceAccess(ctx, report);
    await requirePermission(ctx, "sign_off");
    const isApproved = args.status === "Approved";
    await ctx.db.patch(args.id, {
      status: args.status,
      signoffData: isApproved
        ? authUser.name?.trim() || authUser.email?.trim() || "Unknown user"
        : undefined,
      signoffFont: isApproved ? "Satisfy, cursive" : undefined,
      signoffType: isApproved ? "text" : undefined,
      signedBy: isApproved ? authUser._id : undefined,
      signedAt: isApproved ? Date.now() : undefined,
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("labReports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) {
      throw new Error("Lab report not found");
    }
    await requirePersonalOrWorkspaceAccess(ctx, report);
    await requirePermission(ctx, "sign_off");
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
