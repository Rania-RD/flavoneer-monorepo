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
import {
  localizeArray,
  makeLocalizedString,
  selectLocalizedString,
} from "./localization";
import { logTeamAction } from "./teamAuditLogs";
import {
  batchCodeFormatValidator,
  enrichedProjectReturnValidator,
  formulationStateValidator,
  ingredientValidator,
  languageValidator,
  localizedStringValidator,
  phaseValidator,
  projectStatusValidator,
  servingSizeModeValidator,
  servingSizeUnitValidator,
} from "./validators";

// ── Helpers ──────────────────────────────────────────

type RecipeStepType =
  | "weighing"
  | "timer"
  | "process"
  | "critical_check"
  | "conditional"
  | "spreadsheet_note";

function getNextMajorVersion(version: string) {
  const trimmed = version.trim();
  const match = trimmed.match(/^([vV]?)(\d+)(?:\.(\d+))?$/);

  if (!match) {
    return "V2";
  }

  const [, prefix, major, minor] = match;
  const normalizedPrefix = prefix ? "V" : "";
  const nextMajor = (Number.parseInt(major, 10) || 1) + 1;
  return minor === undefined
    ? `${normalizedPrefix}${nextMajor}`
    : `${normalizedPrefix}${nextMajor}.0`;
}

function getCloneBaseName(name: string) {
  const cleaned = name
    .replace(/\s*\(\s*copy\s*\)\s*$/i, "")
    .replace(/\s+-\s*copy\s*$/i, "")
    .replace(/\s+copy\s*$/i, "")
    .replace(/\s+v?\d+(?:\.\d+)?\s*$/i, "")
    .trim();
  return cleaned || name.trim() || "Untitled Formulation";
}

function getVersionedCloneName(baseName: string, version: string) {
  return `${baseName} ${version}`.trim();
}

function withProjectLocalizedFields<T extends Record<string, unknown>>(
  data: T
) {
  const output = { ...data } as Record<string, unknown>;
  const fields = [
    "name",
    "description",
    "category",
    "gsfaCategoryName",
    "packagingItemName",
    "productType",
    "processingMethod",
    "targetOutcome",
    "nutritionalGoal",
    "targetTexture",
  ];

  for (const field of fields) {
    const i18nField = `${field}I18n`;
    if (field in output || i18nField in output) {
      output[i18nField] = makeLocalizedString(
        output[field] as string | undefined,
        output[i18nField] as { ar?: string; en?: string } | undefined
      );
    }
  }

  return output as T;
}

async function enrichProject(
  ctx: QueryCtx,
  project: Doc<"projects">,
  language?: string
) {
  // Join ingredients
  const allIngredients = await ctx.db
    .query("projectIngredients")
    .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
    .collect();

  const ingredients = allIngredients
    .filter((i) => i.versionTag === "current")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({
      id: i.ingredientKey,
      name: selectLocalizedString(i.name, i.nameI18n, language),
      nameI18n: makeLocalizedString(i.name, i.nameI18n),
      weight: i.weight,
      unit: i.unit,
      percentage: i.percentage,
      costPerKg: i.costPerKg,
    }));

  const previousVersionIngredients = allIngredients
    .filter((i) => i.versionTag === "previous")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({
      id: i.ingredientKey,
      name: selectLocalizedString(i.name, i.nameI18n, language),
      nameI18n: makeLocalizedString(i.name, i.nameI18n),
      weight: i.weight,
      unit: i.unit,
      percentage: i.percentage,
      costPerKg: i.costPerKg,
    }));

  // Join phases + steps
  const phaseDocs = await ctx.db
    .query("recipePhases")
    .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
    .collect();

  const phases = await Promise.all(
    phaseDocs
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(async (phase) => {
        const stepDocs = await ctx.db
          .query("recipeSteps")
          .withIndex("by_phaseId", (q) => q.eq("phaseId", phase._id))
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
    ...project,
    name: selectLocalizedString(project.name, project.nameI18n, language),
    nameI18n: makeLocalizedString(project.name, project.nameI18n),
    description: selectLocalizedString(
      project.description,
      project.descriptionI18n,
      language
    ),
    descriptionI18n: makeLocalizedString(
      project.description,
      project.descriptionI18n
    ),
    category: selectLocalizedString(
      project.category,
      project.categoryI18n,
      language
    ),
    categoryI18n: makeLocalizedString(project.category, project.categoryI18n),
    gsfaCategoryName: selectLocalizedString(
      project.gsfaCategoryName,
      project.gsfaCategoryNameI18n,
      language
    ),
    gsfaCategoryNameI18n: makeLocalizedString(
      project.gsfaCategoryName,
      project.gsfaCategoryNameI18n
    ),
    packagingItemName: selectLocalizedString(
      project.packagingItemName,
      project.packagingItemNameI18n,
      language
    ),
    packagingItemNameI18n: makeLocalizedString(
      project.packagingItemName,
      project.packagingItemNameI18n
    ),
    productType: selectLocalizedString(
      project.productType,
      project.productTypeI18n,
      language
    ),
    productTypeI18n: makeLocalizedString(
      project.productType,
      project.productTypeI18n
    ),
    processingMethod: selectLocalizedString(
      project.processingMethod,
      project.processingMethodI18n,
      language
    ),
    processingMethodI18n: makeLocalizedString(
      project.processingMethod,
      project.processingMethodI18n
    ),
    targetOutcome: selectLocalizedString(
      project.targetOutcome,
      project.targetOutcomeI18n,
      language
    ),
    targetOutcomeI18n: makeLocalizedString(
      project.targetOutcome,
      project.targetOutcomeI18n
    ),
    nutritionalGoal: selectLocalizedString(
      project.nutritionalGoal,
      project.nutritionalGoalI18n,
      language
    ),
    nutritionalGoalI18n: makeLocalizedString(
      project.nutritionalGoal,
      project.nutritionalGoalI18n
    ),
    testingRequirements: localizeArray(
      project.testingRequirements,
      project.testingRequirementsI18n,
      language
    ),
    targetTexture: selectLocalizedString(
      project.targetTexture,
      project.targetTextureI18n,
      language
    ),
    targetTextureI18n: makeLocalizedString(
      project.targetTexture,
      project.targetTextureI18n
    ),
    updatedAt: project.updatedAt ?? "",
    ingredients,
    phases: phases.length > 0 ? phases : undefined,
    authorizedExecutor: project.authorizedExecutor,
  };
}

/**
 * Helper to replace ingredients for a project.
 */
async function replaceIngredients(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  ingredients: Array<{
    id: string;
    name: string;
    nameI18n?: { ar?: string; en?: string };
    weight: number;
    unit?: string;
    percentage?: number;
    costPerKg?: number;
  }>,
  versionTag: "current" | "previous" = "current"
) {
  // Delete existing
  const existingRecords = await ctx.db
    .query("projectIngredients")
    .withIndex("by_projectId_versionTag", (q) =>
      q.eq("projectId", projectId).eq("versionTag", versionTag)
    )
    .collect();

  for (const record of existingRecords) {
    await ctx.db.delete(record._id);
  }

  // Insert new
  for (let i = 0; i < ingredients.length; i++) {
    const item = ingredients[i];
    await ctx.db.insert("projectIngredients", {
      projectId,
      ingredientKey: item.id,
      name: item.name,
      nameI18n: makeLocalizedString(item.name, item.nameI18n),
      weight: item.weight,
      unit: item.unit,
      percentage: item.percentage,
      costPerKg: item.costPerKg,
      versionTag,
      sortOrder: i,
    });
  }
}

/**
 * Helper to replace phases and steps for a project.
 */
async function replacePhases(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  phases: Array<{
    id: string;
    name: string;
    nameI18n?: { ar?: string; en?: string };
    color: string;
    steps: Array<{
      id: string;
      type: string;
      label: string;
      labelI18n?: { ar?: string; en?: string };
      notes?: string;
      notesI18n?: { ar?: string; en?: string };
      ingredientId?: string;
      expectedWeight?: number;
      maxLimitPercent?: number;
      unit?: string;
      tolerance?: number;
      durationSeconds?: number;
      processTemp?: number;
      processSpeed?: string;
      actualWeight?: number;
      isCompleted?: boolean;
      requiresSignOff?: boolean;
      criticalParams?: Array<{
        name: string;
        min?: number;
        max?: number;
        unit?: string;
      }>;
      onFail?: {
        action: "redirect_dispose" | "report_reason";
        reasonPrompt?: string;
      };
      spreadsheet?: Doc<"recipeSteps">["spreadsheet"];
    }>;
  }>
) {
  // Delete existing phases and steps
  const existingPhases = await ctx.db
    .query("recipePhases")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .collect();

  for (const phase of existingPhases) {
    const steps = await ctx.db
      .query("recipeSteps")
      .withIndex("by_phaseId", (q) => q.eq("phaseId", phase._id))
      .collect();
    for (const step of steps) {
      await ctx.db.delete(step._id);
    }
    await ctx.db.delete(phase._id);
  }

  // Insert new
  for (let pi = 0; pi < phases.length; pi++) {
    const phase = phases[pi];
    const phaseId = await ctx.db.insert("recipePhases", {
      projectId,
      phaseKey: phase.id,
      name: phase.name,
      nameI18n: makeLocalizedString(phase.name, phase.nameI18n),
      color: phase.color,
      sortOrder: pi,
    });
    for (let si = 0; si < phase.steps.length; si++) {
      const step = phase.steps[si];
      await ctx.db.insert("recipeSteps", {
        phaseId,
        projectId,
        stepKey: step.id,
        type: step.type as RecipeStepType,
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
        isCompleted: step.isCompleted,
        requiresSignOff: step.requiresSignOff,
        criticalParams: step.criticalParams,
        onFail: step.onFail,
        spreadsheet: step.spreadsheet,
        sortOrder: si,
      });
    }
  }
}

async function saveProjectSnapshot(
  ctx: MutationCtx,
  projectId: Id<"projects">
) {
  const project = await ctx.db.get(projectId);
  if (!project) {
    return;
  }

  const ingredients = await ctx.db
    .query("projectIngredients")
    .withIndex("by_projectId_versionTag", (q) =>
      q.eq("projectId", projectId).eq("versionTag", "current")
    )
    .collect();

  const phases = await ctx.db
    .query("recipePhases")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .collect();

  const phasesWithSteps = await Promise.all(
    phases.map(async (phase) => {
      const steps = await ctx.db
        .query("recipeSteps")
        .withIndex("by_phaseId", (q) => q.eq("phaseId", phase._id))
        .collect();
      return { ...phase, steps };
    })
  );

  const snapshotData = Object.fromEntries(
    Object.entries({
      name: project.name,
      nameI18n: project.nameI18n,
      version: project.version,
      status: project.status,
      lead: project.lead,
      description: project.description,
      descriptionI18n: project.descriptionI18n,
      category: project.category,
      categoryI18n: project.categoryI18n,
      gsfaCategoryCode: project.gsfaCategoryCode,
      gsfaCategoryName: project.gsfaCategoryName,
      gsfaCategoryNameI18n: project.gsfaCategoryNameI18n,
      formulationState: project.formulationState,
      yield: project.yield,
      batchWeight: project.batchWeight,
      batchCost: project.batchCost,
      costPerServing: project.costPerServing,
      packagingItemName: project.packagingItemName,
      packagingItemNameI18n: project.packagingItemNameI18n,
      packagingUnitPrice: project.packagingUnitPrice,
      packagingCapacity: project.packagingCapacity,
      packagingCapacityUnit: project.packagingCapacityUnit,
      packagingCostPerUnit: project.packagingCostPerUnit,
      finishedGoodCostPerUnit: project.finishedGoodCostPerUnit,
      totalProjectRDCost: project.totalProjectRDCost,
      servingSizeMode: project.servingSizeMode,
      servingSizeAmount: project.servingSizeAmount,
      servingSizeUnit: project.servingSizeUnit,
      allergenRegion: project.allergenRegion,
      allergenReviewRequired: project.allergenReviewRequired,
      formulationAllergens: project.formulationAllergens,
      formulationAllergenOverrides: project.formulationAllergenOverrides,
      formulationExtraAllergens: project.formulationExtraAllergens,
      releaseNotes: project.releaseNotes,
      productType: project.productType,
      productTypeI18n: project.productTypeI18n,
      processingMethod: project.processingMethod,
      processingMethodI18n: project.processingMethodI18n,
      targetOutcome: project.targetOutcome,
      targetOutcomeI18n: project.targetOutcomeI18n,
      nutritionalGoal: project.nutritionalGoal,
      nutritionalGoalI18n: project.nutritionalGoalI18n,
      testingRequirements: project.testingRequirements,
      testingRequirementsI18n: project.testingRequirementsI18n,
      processingTemp: project.processingTemp,
      processingTime: project.processingTime,
      targetTexture: project.targetTexture,
      targetTextureI18n: project.targetTextureI18n,
      updatedAt: project.updatedAt,
      batchCodePrefix: project.batchCodePrefix,
      batchCodeFormat: project.batchCodeFormat,
      userId: project.userId,
      teamId: project.teamId,
      releasedBy: project.releasedBy,
      releasedAt: project.releasedAt,
      formattedId: project.formattedId,
      ingredients: project.ingredients,
      progress: project.progress,
      authorizedExecutor: project.authorizedExecutor,
    }).filter(([, value]) => value !== undefined)
  ) as Doc<"projectVersions">["data"];
  const now = new Date();
  const snapshotName = `Auto-Save ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

  await ctx.db.insert("projectVersions", {
    projectId,
    version: project.version,
    name: snapshotName,
    data: snapshotData,
    ingredients,
    phases: phasesWithSteps,
    createdAt: Date.now(),
    createdBy: project.userId || "system",
    releasedBy: project.releasedBy,
    releasedAt: project.releasedAt,
    formattedId: project.formattedId,
  });
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(projectStatusValidator),
    language: v.optional(languageValidator),
  },
  handler: async (ctx, args) => {
    let result: {
      page: Doc<"projects">[];
      isDone: boolean;
      continueCursor: string;
    };
    if (args.status) {
      result = await ctx.db
        .query("projects")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db.query("projects").paginate(args.paginationOpts);
    }
    const page = await Promise.all(
      result.page.map((p) => enrichProject(ctx, p, args.language))
    );
    return { ...result, page };
  },
});

export const listByTeam = query({
  args: {
    paginationOpts: paginationOptsValidator,
    teamId: v.optional(v.id("teams")),
    status: v.optional(projectStatusValidator),
    language: v.optional(languageValidator),
  },
  handler: async (ctx, args) => {
    let result: {
      page: Doc<"projects">[];
      isDone: boolean;
      continueCursor: string;
    };
    if (args.teamId) {
      if (args.status) {
        result = await ctx.db
          .query("projects")
          .withIndex("by_teamId_status", (q) =>
            q.eq("teamId", args.teamId!).eq("status", args.status!)
          )
          .paginate(args.paginationOpts);
      } else {
        result = await ctx.db
          .query("projects")
          .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId!))
          .paginate(args.paginationOpts);
      }
    } else if (args.status) {
      result = await ctx.db
        .query("projects")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db.query("projects").paginate(args.paginationOpts);
    }
    const page = await Promise.all(
      result.page.map((p) => enrichProject(ctx, p, args.language))
    );
    return { ...result, page };
  },
});

export const get = query({
  args: { id: v.id("projects"), language: v.optional(languageValidator) },
  returns: v.union(enrichedProjectReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) {
      return null;
    }

    // Auth & Access Check
    const authUserId = (await ctx.auth.getUserIdentity())?.subject;
    if (!authUserId) {
      return null; // Guest users must login to redeem/view
    }

    let sharedRole: "viewer" | "editor" | undefined;

    if (project.teamId) {
      const teamMember = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId_userId", (q) =>
          q.eq("teamId", project.teamId!).eq("userId", authUserId!)
        )
        .first();

      if (teamMember) {
        // User is a native team member, they get full access natively,
        // but we can map them as 'editor' if needed, or leave undefined (team handles it natively).
      } else {
        // Not in team. Check if they have shared access.
        const access = await ctx.db
          .query("sharedAccess")
          .withIndex("by_userId_entityId", (q) =>
            q.eq("userId", authUserId!).eq("entityId", project._id)
          )
          .first();

        if (access) {
          sharedRole = access.role;
        } else {
          // No team access and no shared access
          return null;
        }
      }
    } else {
      // If project has no team ID, only the creator or those with shared access should see it
      if (project.userId !== authUserId) {
        const access = await ctx.db
          .query("sharedAccess")
          .withIndex("by_userId_entityId", (q) =>
            q.eq("userId", authUserId!).eq("entityId", project._id)
          )
          .first();

        if (access) {
          sharedRole = access.role;
        } else {
          return null;
        }
      }
    }

    const enriched = await enrichProject(ctx, project, args.language);
    return { ...enriched, sharedRole };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    nameI18n: v.optional(localizedStringValidator),
    version: v.string(),
    status: projectStatusValidator,
    lead: v.string(),
    description: v.string(),
    descriptionI18n: v.optional(localizedStringValidator),
    category: v.optional(v.string()),
    categoryI18n: v.optional(localizedStringValidator),
    gsfaCategoryCode: v.optional(v.string()),
    gsfaCategoryName: v.optional(v.string()),
    gsfaCategoryNameI18n: v.optional(localizedStringValidator),
    formulationState: v.optional(formulationStateValidator),
    yield: v.optional(v.number()),
    batchWeight: v.optional(v.number()),
    batchCost: v.optional(v.number()),
    costPerServing: v.optional(v.number()),
    packagingItemName: v.optional(v.string()),
    packagingItemNameI18n: v.optional(localizedStringValidator),
    packagingUnitPrice: v.optional(v.number()),
    packagingCapacity: v.optional(v.number()),
    packagingCapacityUnit: v.optional(v.string()),
    packagingCostPerUnit: v.optional(v.number()),
    finishedGoodCostPerUnit: v.optional(v.number()),
    totalProjectRDCost: v.optional(v.number()),
    servingSizeMode: v.optional(servingSizeModeValidator),
    servingSizeAmount: v.optional(v.number()),
    servingSizeUnit: v.optional(servingSizeUnitValidator),
    allergenRegion: v.optional(v.string()),
    allergenReviewRequired: v.optional(v.boolean()),
    formulationAllergens: v.optional(v.array(v.string())),
    formulationAllergenOverrides: v.optional(v.record(v.string(), v.boolean())),
    formulationExtraAllergens: v.optional(v.array(v.string())),
    productType: v.optional(v.string()),
    productTypeI18n: v.optional(localizedStringValidator),
    processingMethod: v.optional(v.string()),
    processingMethodI18n: v.optional(localizedStringValidator),
    targetOutcome: v.optional(v.string()),
    targetOutcomeI18n: v.optional(localizedStringValidator),
    nutritionalGoal: v.optional(v.string()),
    nutritionalGoalI18n: v.optional(localizedStringValidator),
    testingRequirements: v.optional(v.array(v.string())),
    testingRequirementsI18n: v.optional(v.array(localizedStringValidator)),
    processingTemp: v.optional(v.number()),
    processingTime: v.optional(v.string()),
    targetTexture: v.optional(v.string()),
    targetTextureI18n: v.optional(localizedStringValidator),
    // Use shared validators
    ingredients: v.array(ingredientValidator),
    previousVersionIngredients: v.optional(v.array(ingredientValidator)),
    phases: v.optional(v.array(phaseValidator)),
    batchCodePrefix: v.optional(v.string()),
    batchCodeFormat: v.optional(batchCodeFormatValidator),
    userId: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    authorizedExecutor: v.optional(v.string()),
  },
  returns: v.id("projects"),
  handler: async (ctx, args) => {
    const {
      ingredients,
      previousVersionIngredients,
      phases,
      authorizedExecutor,
      ...projectData
    } = args;

    // 1. Auto-generate ID if Traceability Config is active
    let generatedBatchCodePrefix = projectData.batchCodePrefix;
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_configKey", (q) => q.eq("configKey", "traceability"))
      .first();

    if (config) {
      const currentIdNum = config.currentIdNumber || 1;
      generatedBatchCodePrefix = `${config.idPrefix || "FD-"}${String(currentIdNum).padStart(3, "0")}`;
      await ctx.db.patch(config._id, { currentIdNumber: currentIdNum + 1 });
    }

    // 2. Insert the project row
    const projectId = await ctx.db.insert("projects", {
      ...withProjectLocalizedFields(projectData),
      batchCodePrefix: generatedBatchCodePrefix,
      userId: projectData.userId ?? null,
      teamId: projectData.teamId ?? null,
      authorizedExecutor,
    });

    // 2. Insert ingredients using helper
    await replaceIngredients(ctx, projectId, ingredients, "current");

    if (previousVersionIngredients) {
      await replaceIngredients(
        ctx,
        projectId,
        previousVersionIngredients,
        "previous"
      );
    }

    // 3. Insert phases using helper
    if (phases) {
      await replacePhases(ctx, projectId, phases);
    }

    return projectId;
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    nameI18n: v.optional(localizedStringValidator),
    version: v.optional(v.string()),
    status: v.optional(projectStatusValidator),
    lead: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionI18n: v.optional(localizedStringValidator),
    category: v.optional(v.string()),
    categoryI18n: v.optional(localizedStringValidator),
    gsfaCategoryCode: v.optional(v.string()),
    gsfaCategoryName: v.optional(v.string()),
    gsfaCategoryNameI18n: v.optional(localizedStringValidator),
    formulationState: v.optional(formulationStateValidator),
    yield: v.optional(v.number()),
    batchWeight: v.optional(v.number()),
    batchCost: v.optional(v.number()),
    costPerServing: v.optional(v.number()),
    packagingItemName: v.optional(v.string()),
    packagingItemNameI18n: v.optional(localizedStringValidator),
    packagingUnitPrice: v.optional(v.number()),
    packagingCapacity: v.optional(v.number()),
    packagingCapacityUnit: v.optional(v.string()),
    packagingCostPerUnit: v.optional(v.number()),
    finishedGoodCostPerUnit: v.optional(v.number()),
    totalProjectRDCost: v.optional(v.number()),
    servingSizeMode: v.optional(servingSizeModeValidator),
    servingSizeAmount: v.optional(v.number()),
    servingSizeUnit: v.optional(servingSizeUnitValidator),
    allergenRegion: v.optional(v.string()),
    allergenReviewRequired: v.optional(v.boolean()),
    formulationAllergens: v.optional(v.array(v.string())),
    formulationAllergenOverrides: v.optional(v.record(v.string(), v.boolean())),
    formulationExtraAllergens: v.optional(v.array(v.string())),
    productType: v.optional(v.string()),
    productTypeI18n: v.optional(localizedStringValidator),
    processingMethod: v.optional(v.string()),
    processingMethodI18n: v.optional(localizedStringValidator),
    targetOutcome: v.optional(v.string()),
    targetOutcomeI18n: v.optional(localizedStringValidator),
    nutritionalGoal: v.optional(v.string()),
    nutritionalGoalI18n: v.optional(localizedStringValidator),
    testingRequirements: v.optional(v.array(v.string())),
    testingRequirementsI18n: v.optional(v.array(localizedStringValidator)),
    processingTemp: v.optional(v.number()),
    processingTime: v.optional(v.string()),
    targetTexture: v.optional(v.string()),
    targetTextureI18n: v.optional(localizedStringValidator),
    ingredients: v.optional(v.array(ingredientValidator)),
    previousVersionIngredients: v.optional(v.array(ingredientValidator)),
    phases: v.optional(v.array(phaseValidator)),
    batchCodePrefix: v.optional(v.string()),
    batchCodeFormat: v.optional(batchCodeFormatValidator),
    teamId: v.optional(v.id("teams")),
    userId: v.optional(v.string()),
    releaseNotes: v.optional(v.string()),
    releasedBy: v.optional(v.string()),
    authorizedExecutor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ingredients, previousVersionIngredients, phases, ...updates } =
      args;

    const existingProject = await ctx.db.get(id);
    if (!existingProject) {
      throw new Error("Project not found");
    }

    // Enforce Approval Workflow logic
    const releaseMetadata: { releasedAt?: string; formattedId?: string } = {};
    if (updates.status === "Released") {
      const unresolvedComments = await ctx.db
        .query("comments")
        .withIndex("by_projectId_isResolved", (q) =>
          q.eq("projectId", id).eq("isResolved", false)
        )
        .take(1);

      if (unresolvedComments.length > 0) {
        throw new Error(
          "Cannot release protocol while there are unresolved comments."
        );
      }

      // Populate Release Metadata
      if (updates.releasedBy) {
        releaseMetadata.releasedAt = new Date().toISOString();
        // formatted ID based on current project batchCodePrefix or default fallback
        releaseMetadata.formattedId =
          existingProject.batchCodePrefix || "FD-000";
      }
    }

    // Update project scalar fields
    const normalizedUpdates = withProjectLocalizedFields({
      ...updates,
      ...releaseMetadata,
    });
    const filtered = Object.fromEntries(
      Object.entries(normalizedUpdates).filter(([_, v]) => v !== undefined)
    );
    if (Object.keys(filtered).length > 0) {
      await ctx.db.patch(id, filtered);
    }

    // Replace ingredients if provided
    if (ingredients !== undefined) {
      await replaceIngredients(ctx, id, ingredients, "current");
    }

    if (previousVersionIngredients !== undefined) {
      await replaceIngredients(ctx, id, previousVersionIngredients, "previous");
    }

    // Replace phases if provided
    if (phases !== undefined) {
      await replacePhases(ctx, id, phases);
    }

    // Real-time Notification for Release -> Audit Log
    if (
      updates.status === "Released" &&
      existingProject?.status !== "Released"
    ) {
      const teamId = existingProject.teamId || updates.teamId;
      if (teamId) {
        const authUser = await authComponent.getAuthUser(ctx);
        if (authUser) {
          await logTeamAction(ctx, {
            teamId,
            actorId: authUser._id,
            actorName: authUser.name || authUser.email || "Unknown User",
            action: "Formulation Released",
            targetType: "project",
            targetId: id,
            targetLabel: existingProject.name,
          });
        }
      }
    }

    // Auto-increment version if Sign-off (Approved) and Config is enabled
    if (updates.status === "Approved") {
      const project = await ctx.db.get(id);
      if (project) {
        const config = await ctx.db
          .query("systemConfig")
          .withIndex("by_configKey", (q) => q.eq("configKey", "versionControl"))
          .first();

        if (config?.autoIncrementVersion) {
          const prefix = config.versionPrefix || "V";
          const style = config.versionStyle || "major-minor";

          let currentNumStr = project.version;
          // Attempt to strip prefix to get pure numbers
          if (currentNumStr.toUpperCase().startsWith(prefix.toUpperCase())) {
            currentNumStr = currentNumStr.substring(prefix.length);
          } else if (currentNumStr.toUpperCase().startsWith("V")) {
            currentNumStr = currentNumStr.substring(1);
          }

          let newVersion = project.version;
          if (style === "single") {
            const num = Number.parseInt(currentNumStr, 10) || 0;
            newVersion = `${prefix}${num + 1}`;
          } else {
            const parts = currentNumStr.split(".");
            const major = Number.parseInt(parts[0], 10) || 1;
            const minor = Number.parseInt(parts[1], 10) || 0;
            newVersion = `${prefix}${major}.${minor + 1}`;
          }
          await ctx.db.patch(id, { version: newVersion });
        }
      }
    }

    // Auto-create an immutable snapshot of this saved state
    await saveProjectSnapshot(ctx, id);

    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Cascade: delete ingredients
    const ings = await ctx.db
      .query("projectIngredients")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.id))
      .collect();
    for (const ing of ings) {
      await ctx.db.delete(ing._id);
    }

    // Cascade: delete phases and steps
    const phases = await ctx.db
      .query("recipePhases")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.id))
      .collect();
    for (const phase of phases) {
      const steps = await ctx.db
        .query("recipeSteps")
        .withIndex("by_phaseId", (q) => q.eq("phaseId", phase._id))
        .collect();
      for (const step of steps) {
        await ctx.db.delete(step._id);
      }
      await ctx.db.delete(phase._id);
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

async function cloneProjectAsDraftVersion(
  ctx: MutationCtx,
  projectId: Id<"projects">
) {
  const original = await ctx.db.get(projectId);
  if (!original) {
    throw new Error("Project not found");
  }

  const newVersion = getNextMajorVersion(original.version);
  const baseName = getCloneBaseName(original.name);
  const newName = getVersionedCloneName(baseName, newVersion);
  const newNameI18n = {
    en: getVersionedCloneName(
      getCloneBaseName(original.nameI18n?.en || original.name),
      newVersion
    ),
    ar: getVersionedCloneName(
      getCloneBaseName(
        original.nameI18n?.ar || original.nameI18n?.en || original.name
      ),
      newVersion
    ),
  };

  const clonedProjectData = Object.fromEntries(
    Object.entries({
      name: newName,
      nameI18n: newNameI18n,
      version: newVersion,
      status: "Draft",
      lead: original.lead,
      description: original.description,
      descriptionI18n: original.descriptionI18n,
      category: original.category,
      categoryI18n: original.categoryI18n,
      gsfaCategoryCode: original.gsfaCategoryCode,
      gsfaCategoryName: original.gsfaCategoryName,
      gsfaCategoryNameI18n: original.gsfaCategoryNameI18n,
      formulationState: original.formulationState,
      yield: original.yield,
      batchWeight: original.batchWeight,
      totalProjectRDCost: original.totalProjectRDCost ?? original.batchCost,
      packagingItemName: original.packagingItemName,
      packagingItemNameI18n: original.packagingItemNameI18n,
      packagingUnitPrice: original.packagingUnitPrice,
      packagingCapacity: original.packagingCapacity,
      packagingCapacityUnit: original.packagingCapacityUnit,
      packagingCostPerUnit: original.packagingCostPerUnit,
      finishedGoodCostPerUnit: original.finishedGoodCostPerUnit,
      servingSizeMode: original.servingSizeMode,
      servingSizeAmount: original.servingSizeAmount,
      servingSizeUnit: original.servingSizeUnit,
      allergenRegion: original.allergenRegion,
      allergenReviewRequired: false,
      formulationAllergens: original.formulationAllergens,
      formulationAllergenOverrides: original.formulationAllergenOverrides,
      formulationExtraAllergens: original.formulationExtraAllergens,
      productType: original.productType,
      productTypeI18n: original.productTypeI18n,
      processingMethod: original.processingMethod,
      processingMethodI18n: original.processingMethodI18n,
      targetOutcome: original.targetOutcome,
      targetOutcomeI18n: original.targetOutcomeI18n,
      nutritionalGoal: original.nutritionalGoal,
      nutritionalGoalI18n: original.nutritionalGoalI18n,
      testingRequirements: original.testingRequirements,
      testingRequirementsI18n: original.testingRequirementsI18n,
      processingTemp: original.processingTemp,
      processingTime: original.processingTime,
      targetTexture: original.targetTexture,
      targetTextureI18n: original.targetTextureI18n,
      updatedAt: new Date().toISOString(),
      batchCodePrefix: original.batchCodePrefix,
      batchCodeFormat: original.batchCodeFormat,
      userId: original.userId,
      teamId: original.teamId,
      ingredients: original.ingredients,
      progress: original.progress,
      authorizedExecutor: original.authorizedExecutor,
    }).filter(([, value]) => value !== undefined)
  ) as Omit<Doc<"projects">, "_id" | "_creationTime">;

  const newProjectId = await ctx.db.insert("projects", clonedProjectData);
  await ctx.db.patch(newProjectId, {
    name: newName,
    nameI18n: newNameI18n,
    version: newVersion,
    status: "Draft",
    allergenReviewRequired: false,
  });

  // Copy ingredients
  const ings = await ctx.db
    .query("projectIngredients")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .collect();
  for (const ing of ings) {
    const { _id: _, _creationTime: __, projectId: _pid, ...ingData } = ing;
    await ctx.db.insert("projectIngredients", {
      ...ingData,
      projectId: newProjectId,
    });
  }

  // Copy phases and steps
  const phases = await ctx.db
    .query("recipePhases")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .collect();
  for (const phase of phases) {
    const {
      _id: phaseOldId,
      _creationTime: __,
      projectId: _pid,
      ...phaseData
    } = phase;
    const newPhaseId = await ctx.db.insert("recipePhases", {
      ...phaseData,
      projectId: newProjectId,
    });
    const steps = await ctx.db
      .query("recipeSteps")
      .withIndex("by_phaseId", (q) => q.eq("phaseId", phaseOldId))
      .collect();
    for (const step of steps) {
      const {
        _id: ___,
        _creationTime: ____,
        phaseId: _phid,
        projectId: _spid,
        ...stepData
      } = step;
      await ctx.db.insert("recipeSteps", {
        ...stepData,
        phaseId: newPhaseId,
        projectId: newProjectId,
      });
    }
  }

  const dependencies = await ctx.db
    .query("stepDependencies")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .collect();
  for (const dependency of dependencies) {
    const {
      _id: _,
      _creationTime: __,
      projectId: _pid,
      ...dependencyData
    } = dependency;
    await ctx.db.insert("stepDependencies", {
      ...dependencyData,
      projectId: newProjectId,
    });
  }

  return newProjectId;
}

export const createNewVersion = mutation({
  args: { id: v.id("projects") },
  returns: v.id("projects"),
  handler: async (ctx, args) => await cloneProjectAsDraftVersion(ctx, args.id),
});

export const duplicate = mutation({
  args: { id: v.id("projects") },
  returns: v.id("projects"),
  handler: async (ctx, args) => await cloneProjectAsDraftVersion(ctx, args.id),
});
