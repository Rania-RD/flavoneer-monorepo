import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { authComponent } from "./auth";
import { makeLocalizedString, selectLocalizedString } from "./localization";
import { logTeamAction } from "./teamAuditLogs";
import { convertUnits } from "./units";
import {
  enrichedRunReturnValidator,
  languageValidator,
  phaseValidator,
  runIngredientUsageValidator,
  signatureTypeValidator,
} from "./validators";

// ── Helpers ──────────────────────────────────────────

function formatDuration(
  startTime: number,
  endTime: number,
  language?: string
): string {
  const totalSec = Math.round((endTime - startTime) / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (language === "ar") {
    return `${minutes} د ${seconds} ث`;
  }
  return `${minutes}m ${seconds}s`;
}

async function enrichRun(ctx: QueryCtx, run: Doc<"runs">, language?: string) {
  // Look up project name from projectId
  let projectName = selectLocalizedString(
    run.projectName,
    run.projectNameI18n,
    language
  );
  let projectNameI18n = makeLocalizedString(
    run.projectName,
    run.projectNameI18n
  );
  try {
    const project = await ctx.db.get(run.projectId);
    if (project) {
      projectName = selectLocalizedString(
        project.name,
        project.nameI18n,
        language
      );
      projectNameI18n = makeLocalizedString(project.name, project.nameI18n);
    }
  } catch {
    projectName = selectLocalizedString(
      run.projectName,
      run.projectNameI18n,
      language
    );
  }

  // Join run-scoped phases + steps
  const phaseDocs = await ctx.db
    .query("runPhases")
    .withIndex("by_runId", (q) => q.eq("runId", run._id))
    .collect();

  const phases = await Promise.all(
    phaseDocs
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(async (phase) => {
        const stepDocs = await ctx.db
          .query("runSteps")
          .withIndex("by_runPhaseId", (q) => q.eq("runPhaseId", phase._id))
          .collect();
        return {
          id: phase.phaseKey,
          name: selectLocalizedString(phase.name, phase.nameI18n, language),
          nameI18n: makeLocalizedString(phase.name, phase.nameI18n),
          color: phase.color,
          steps: stepDocs
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((s) => ({
              id: s.stepKey,
              type: s.type,
              label: selectLocalizedString(s.label, s.labelI18n, language),
              labelI18n: makeLocalizedString(s.label, s.labelI18n),
              notes: selectLocalizedString(s.notes, s.notesI18n, language),
              notesI18n: makeLocalizedString(s.notes, s.notesI18n),
              isCompleted: s.isCompleted ?? false,
              ingredientId: s.ingredientId,
              expectedWeight: s.expectedWeight,
              maxLimitPercent: s.maxLimitPercent,
              actualWeight: s.actualWeight,
              unit: s.unit,
              tolerance: s.tolerance,
              durationSeconds: s.durationSeconds,
              processTemp: s.processTemp,
              processSpeed: s.processSpeed,
              requiresSignOff: s.requiresSignOff,
              criticalParams: s.criticalParams,
              onFail: s.onFail,
              spreadsheet: s.spreadsheet,
            })),
        };
      })
  );

  return {
    ...run,
    projectName,
    projectNameI18n,
    durationString: run.endTime
      ? formatDuration(run.startTime, run.endTime, language)
      : language === "ar"
        ? "قيد التنفيذ"
        : "In progress",
    phases: phases.length > 0 ? phases : undefined,
  };
}

/**
 * Helper to deduct inventory based on run ingredient usage.
 * Uses search index for name matching instead of full table scan.
 */
async function deductInventory(
  ctx: MutationCtx,
  runId: Id<"runs">,
  projectId: Id<"projects">,
  projectName: string,
  batchCode: string,
  ingredients: Array<{ name: string; actualWeight: number; unit?: string }>
) {
  if (!ingredients || ingredients.length === 0) {
    return;
  }

  for (const ing of ingredients) {
    const nameLower = ing.name.toLowerCase().trim();

    // Use search index instead of full table scan
    const matches = await ctx.db
      .query("inventoryItems")
      .withSearchIndex("search_name", (q) => q.search("name", nameLower))
      .take(5);

    // Find exact (case-insensitive) match from search results
    const item = matches.find((i) => i.name.toLowerCase().trim() === nameLower);
    if (!item) {
      continue;
    }

    const fromUnit = ing.unit ?? "g";
    const converted = convertUnits(ing.actualWeight, fromUnit, item.unit);
    if (converted === null) {
      continue;
    }

    const newStock = Math.max(0, item.stock - converted);
    const threshold = item.lowStockThreshold ?? item.stock * 0.2;
    const newStatus =
      newStock <= threshold ? ("low" as const) : ("ok" as const);

    await ctx.db.patch(item._id, {
      stock: newStock,
      stockStatus: newStatus,
    });

    await ctx.db.insert("materialUsageLogs", {
      inventoryItemId: item._id,
      materialName: item.name,
      runId,
      projectId,
      projectName,
      batchCode,
      quantityUsed: converted,
      unit: item.unit,
      createdAt: Date.now(),
    });
  }
}

export const getLabUtilization = query({
  args: { teamId: v.optional(v.id("teams")) },
  returns: v.number(),
  handler: async (ctx, args) => {
    let activeRuns = await ctx.db
      .query("runs")
      .withIndex("by_status", (q) => q.eq("status", "In Progress"))
      .collect();

    if (args.teamId !== undefined) {
      activeRuns = activeRuns.filter((r) => r.teamId === args.teamId);
    }

    console.log(
      `[LabUtilization] Found ${activeRuns.length} runs with status 'In Progress' for team ${args.teamId || "all"}`
    );

    return activeRuns.length;
  },
});

export const list = query({
  args: {
    teamId: v.optional(v.id("teams")),
    paginationOpts: paginationOptsValidator,
    language: v.optional(languageValidator),
  },
  handler: async (ctx, args) => {
    const authUserId = (await ctx.auth.getUserIdentity())?.subject;
    if (!authUserId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    let result: {
      page: Doc<"runs">[];
      isDone: boolean;
      continueCursor: string;
    };
    if (args.teamId) {
      // If teamId is specified, fetch specifically for that team (needs index by_teamId though... or fallback to JS filter if no index. Assuming schema has it or we can just filter JS)
      // Since schema.ts defines index("by_teamId", ["teamId"]) but wait, no, runs doesn't have by_teamId!
      // runs has by_projectId and by_status... Wait, we can just use the base pagination.
      result = await ctx.db
        .query("runs")
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db
        .query("runs")
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Get user's teams
    const userTeams = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .collect();
    const teamIds = new Set(userTeams.map((t) => t.teamId));

    // Get user's explicit sharedAccess for runs
    const sharedAccess = await ctx.db
      .query("sharedAccess")
      .withIndex("by_userId_entityId", (q) => q.eq("userId", authUserId))
      .collect();

    const sharedRunMap = new Map();
    for (const acc of sharedAccess) {
      if (acc.entityType === "run") {
        sharedRunMap.set(acc.entityId, acc.role);
      }
    }

    const visibleRuns = result.page.filter((r) => {
      if (args.teamId && r.teamId !== args.teamId) {
        return false;
      }
      return (
        r.userId === authUserId ||
        (r.teamId && teamIds.has(r.teamId)) ||
        sharedRunMap.has(r._id)
      );
    });

    const page = await Promise.all(
      visibleRuns.map(async (r) => {
        const enriched = await enrichRun(ctx, r, args.language);
        return {
          ...enriched,
          sharedRole: sharedRunMap.get(r._id) || undefined,
        };
      })
    );

    return { ...result, page };
  },
});

export const get = query({
  args: { id: v.id("runs"), language: v.optional(languageValidator) },
  returns: v.union(enrichedRunReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.id);
    if (!run) {
      return null;
    }

    // Auth & Access Check
    const authUserId = (await ctx.auth.getUserIdentity())?.subject;
    if (!authUserId) {
      return null;
    }

    let sharedRole: "viewer" | "editor" | undefined;

    if (run.teamId) {
      const teamMember = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId_userId", (q) =>
          q.eq("teamId", run.teamId!).eq("userId", authUserId)
        )
        .first();

      if (!teamMember) {
        const access = await ctx.db
          .query("sharedAccess")
          .withIndex("by_userId_entityId", (q) =>
            q.eq("userId", authUserId).eq("entityId", run._id)
          )
          .first();

        if (access) {
          sharedRole = access.role;
        } else {
          return null;
        }
      }
    } else if (run.userId !== authUserId) {
      const access = await ctx.db
        .query("sharedAccess")
        .withIndex("by_userId_entityId", (q) =>
          q.eq("userId", authUserId).eq("entityId", run._id)
        )
        .first();

      if (access) {
        sharedRole = access.role;
      } else {
        return null;
      }
    }

    const enriched = await enrichRun(ctx, run, args.language);
    return { ...enriched, sharedRole };
  },
});

export const getByProject = query({
  args: {
    projectId: v.id("projects"),
    language: v.optional(languageValidator),
  },
  returns: v.array(enrichedRunReturnValidator),
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("runs")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
    return Promise.all(runs.map((r) => enrichRun(ctx, r, args.language)));
  },
});

// Generate the next batch code for a project based on its configuration

// ── Start a run (creates record + snapshots phases/steps) ────────
export const startRun = mutation({
  args: {
    projectId: v.id("projects"),
    batchCode: v.string(),
    startTime: v.number(),
    phases: v.optional(v.array(phaseValidator)),
  },
  returns: v.id("runs"),
  handler: async (ctx, args) => {
    const { phases, ...runData } = args;
    const authUserId = (await ctx.auth.getUserIdentity())?.subject;
    const project = await ctx.db.get(args.projectId);

    // 1. Insert the run record (endTime will be set when finished)
    const runId = await ctx.db.insert("runs", {
      ...runData,
      projectName: project?.name ?? "",
      projectNameI18n: makeLocalizedString(project?.name, project?.nameI18n),
      data: {},
      userId: authUserId || undefined,
      teamId: project?.teamId || undefined,
    });

    // 2. Snapshot phases + steps into run-scoped tables
    if (phases && phases.length > 0) {
      for (let pi = 0; pi < phases.length; pi++) {
        const phase = phases[pi];
        const runPhaseId = await ctx.db.insert("runPhases", {
          runId,
          phaseKey: phase.id,
          name: phase.name,
          nameI18n: makeLocalizedString(phase.name, phase.nameI18n),
          color: phase.color,
          sortOrder: pi,
        });
        for (let si = 0; si < phase.steps.length; si++) {
          const step = phase.steps[si];
          await ctx.db.insert("runSteps", {
            runId,
            runPhaseId,
            stepKey: step.id,
            type: step.type,
            label: step.label,
            labelI18n: makeLocalizedString(step.label, step.labelI18n),
            notes: step.notes,
            notesI18n: makeLocalizedString(step.notes, step.notesI18n),
            ingredientId: step.ingredientId,
            expectedWeight: step.expectedWeight,
            maxLimitPercent: step.maxLimitPercent,
            actualWeight: step.actualWeight,
            unit: step.unit,
            tolerance: step.tolerance,
            durationSeconds: step.durationSeconds,
            processTemp: step.processTemp,
            processSpeed: step.processSpeed,
            isCompleted: step.isCompleted ?? false,
            requiresSignOff: step.requiresSignOff,
            criticalParams: step.criticalParams,
            onFail: step.onFail,
            spreadsheet: step.spreadsheet,
            sortOrder: si,
          });
        }
      }
    }
    return runId;
  },
});

// ── Create a new run from a Formulation Master (snapshots phases/steps) ──
export const createNewRun = mutation({
  args: {
    formulationId: v.id("projects"),
  },
  returns: v.id("runs"),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.formulationId);
    if (!project) {
      throw new Error("Project formulation not found");
    }

    if (project.status !== "Released") {
      throw new Error(
        "Unauthorized: Cannot start a run for a non-released formulation"
      );
    }

    const existingRuns = await ctx.db
      .query("runs")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.formulationId))
      .collect();
    const seq = existingRuns.length + 1;

    const prefix =
      project.batchCodePrefix ||
      project.name.split(" ")[0].toUpperCase().slice(0, 4);
    const batchCode = `${prefix}-${String(seq).padStart(3, "0")}`;

    const authUserId = (await ctx.auth.getUserIdentity())?.subject;

    // 1. Insert the run record
    const runId = await ctx.db.insert("runs", {
      projectId: args.formulationId,
      projectName: project.name,
      projectNameI18n: makeLocalizedString(project.name, project.nameI18n),
      batchCode,
      startTime: Date.now(),
      status: "In Progress",
      data: {},
      userId: authUserId || undefined,
      teamId: project.teamId || undefined,
    });

    // 2. Fetch master phases and steps
    const masterPhases = await ctx.db
      .query("recipePhases")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.formulationId))
      .collect();

    if (!masterPhases || masterPhases.length === 0) {
      throw new Error("Cannot start Run: Formulation phases are missing");
    }

    const masterSteps = await ctx.db
      .query("recipeSteps")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.formulationId))
      .collect();

    // 3. Snapshot phases and steps
    let signOffRequired = false;
    for (const phase of masterPhases) {
      const runPhaseId = await ctx.db.insert("runPhases", {
        runId,
        phaseKey: phase.phaseKey,
        name: phase.name,
        nameI18n: makeLocalizedString(phase.name, phase.nameI18n),
        color: phase.color,
        sortOrder: phase.sortOrder,
      });

      const phaseSteps = masterSteps.filter((s) => s.phaseId === phase._id);
      for (const step of phaseSteps) {
        if (step.requiresSignOff) {
          signOffRequired = true;
        }

        await ctx.db.insert("runSteps", {
          runId,
          runPhaseId,
          stepKey: step.stepKey,
          type: step.type,
          label: step.label,
          labelI18n: makeLocalizedString(step.label, step.labelI18n),
          notes: step.notes,
          notesI18n: makeLocalizedString(step.notes, step.notesI18n),
          ingredientId: step.ingredientId,
          expectedWeight: step.expectedWeight,
          maxLimitPercent: step.maxLimitPercent,
          unit: step.unit,
          tolerance: step.tolerance,
          durationSeconds: step.durationSeconds,
          processTemp: step.processTemp,
          processSpeed: step.processSpeed,
          isCompleted: false,
          requiresSignOff: step.requiresSignOff,
          criticalParams: step.criticalParams,
          sortOrder: step.sortOrder,
          onFail: step.onFail,
          spreadsheet: step.spreadsheet,
        });
      }
    }

    const authUser = await authComponent.getAuthUser(ctx);
    if (project.teamId && authUser) {
      await logTeamAction(ctx, {
        teamId: project.teamId,
        actorId: authUser._id,
        actorName: authUser.name || authUser.email || "Unknown User",
        action: "Run Started",
        targetType: "run",
        targetId: runId,
        targetLabel: `${project.name} (Batch ${batchCode})`,
      });

      if (signOffRequired && project.authorizedExecutor) {
        await logTeamAction(ctx, {
          teamId: project.teamId,
          actorId: authUser._id,
          actorName: "System",
          action: "Sign-off Required",
          targetType: "run",
          targetId: runId,
          targetLabel: `${project.name} (Batch ${batchCode})`,
          meta: { authorizedExecutor: project.authorizedExecutor },
        });
      }
    }

    return runId;
  },
});

// ── Finish a run (sets endTime, data, deducts inventory) ─────────
export const finishRun = mutation({
  args: {
    runId: v.id("runs"),
    endTime: v.number(),
    data: v.record(v.string(), v.number()),
    ingredients: v.optional(v.array(runIngredientUsageValidator)),
    status: v.optional(v.union(v.literal("completed"), v.literal("failed"))),
    failureReason: v.optional(v.string()),
    signoffData: v.optional(v.string()),
    signoffFont: v.optional(v.string()),
    signoffType: v.optional(signatureTypeValidator),
  },
  returns: v.id("runs"),
  handler: async (ctx, args) => {
    const {
      runId,
      ingredients,
      status,
      failureReason,
      signoffData,
      signoffFont,
      signoffType,
      ...updates
    } = args;

    const run = await ctx.db.get(runId);
    if (!run) {
      throw new Error("Run not found");
    }

    // 1. Patch the run with endTime + data + status + signoff
    await ctx.db.patch(runId, {
      ...updates,
      status,
      failureReason,
      ...(signoffData !== undefined && { signoffData }),
      ...(signoffFont !== undefined && { signoffFont }),
      ...(signoffType !== undefined && { signoffType }),
    });

    // 2. Look up project name for audit logs
    let projectName = "";
    const projectId = ctx.db.normalizeId("projects", run.projectId);
    if (projectId) {
      const project = await ctx.db.get(projectId);
      projectName = project?.name ?? "";
    }

    // 3. Trigger Audit Log if Failed
    if (status === "failed") {
      const authUser = await authComponent.getAuthUser(ctx);
      if (run.teamId && authUser) {
        await logTeamAction(ctx, {
          teamId: run.teamId,
          actorId: authUser._id,
          actorName: authUser.name || authUser.email || "Unknown User",
          action: "Run Failed",
          targetType: "run",
          targetId: run._id,
          targetLabel: `Batch ${run.batchCode}`,
          meta: { failureReason: failureReason || "Not provided" },
        });
      }
    }

    // 3. Deduct inventory for each ingredient
    if (ingredients && ingredients.length > 0) {
      await deductInventory(
        ctx,
        runId,
        run.projectId,
        projectName,
        run.batchCode,
        ingredients
      );
    }

    return runId;
  },
});

// ── Save Draft (partial update of a run without changing status or triggering side effects) ─────────
export const saveDraft = mutation({
  args: {
    runId: v.id("runs"),
    data: v.record(v.string(), v.number()),
    currentPhaseIndex: v.optional(v.number()),
    currentStepIndex: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { runId, data, currentPhaseIndex, currentStepIndex } = args;

    const run = await ctx.db.get(runId);
    if (!run) {
      throw new Error("Run not found");
    }

    // Only update the data field, keeping the status as it was.
    await ctx.db.patch(runId, {
      data,
      ...(currentPhaseIndex !== undefined && { currentPhaseIndex }),
      ...(currentStepIndex !== undefined && { currentStepIndex }),
    });

    return null;
  },
});

// ── Legacy create (kept for backward compatibility) ──────────────
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    batchCode: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    data: v.record(v.string(), v.number()),
    ingredients: v.optional(v.array(runIngredientUsageValidator)),
  },
  returns: v.id("runs"),
  handler: async (ctx, args) => {
    const { ingredients, ...runData } = args;
    const authUserId = (await ctx.auth.getUserIdentity())?.subject;
    const project = await ctx.db.get(args.projectId);

    const runId = await ctx.db.insert("runs", {
      ...runData,
      userId: authUserId || undefined,
      teamId: project?.teamId || undefined,
    });

    let projectName = "";
    const projectId = ctx.db.normalizeId("projects", args.projectId);
    if (projectId) {
      const project = await ctx.db.get(projectId);
      projectName = project?.name ?? "";
    }

    if (ingredients && ingredients.length > 0) {
      await deductInventory(
        ctx,
        runId,
        args.projectId,
        projectName,
        args.batchCode,
        ingredients
      );
    }

    return runId;
  },
});

// ── Update a single step's actual weight (run-scoped) ─────────
export const updateStepWeight = mutation({
  args: {
    runId: v.id("runs"),
    stepId: v.string(),
    actualWeight: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const allSteps = await ctx.db
      .query("runSteps")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .collect();

    const stepDoc = allSteps.find((s) => s.stepKey === args.stepId);
    if (!stepDoc) {
      throw new Error(`Run step "${args.stepId}" not found`);
    }

    await ctx.db.patch(stepDoc._id, {
      actualWeight: args.actualWeight,
      isCompleted: true,
    });
    return null;
  },
});
