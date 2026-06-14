import { v } from "convex/values";

// ─── Shared Enum Validators ──────────────────────────

export const projectStatusValidator = v.union(
  v.literal("Draft"),
  v.literal("Testing"),
  v.literal("Prototype"),
  v.literal("Under Review"),
  v.literal("Approved"),
  v.literal("Released"),
  v.literal("On Hold")
);

export const formulationStateValidator = v.union(
  v.literal("Liquid"),
  v.literal("Solid")
);

export const servingSizeModeValidator = v.union(
  v.literal("recipeMakes"),
  v.literal("servingIs")
);

export const sharedRoleValidator = v.union(
  v.literal("viewer"),
  v.literal("editor")
);

export const sharedEntityTypeValidator = v.union(
  v.literal("project"),
  v.literal("run")
);

export const stockStatusValidator = v.union(v.literal("ok"), v.literal("low"));

export const labReportStatusValidator = v.union(
  v.literal("Approved"),
  v.literal("Pending"),
  v.literal("Failed")
);

export const equipmentStatusValidator = v.union(
  v.literal("Available"),
  v.literal("In Use"),
  v.literal("Reserved")
);

export const equipmentTypeValidator = v.union(
  v.literal("ph"),
  v.literal("mixer"),
  v.literal("incubator"),
  v.literal("viscometer")
);

export const inviteStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("revoked")
);

export const inviteRoleValidator = v.union(
  v.literal("admin"),
  v.literal("member")
);

export const teamMemberRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member")
);

export const stepTypeValidator = v.union(
  v.literal("weighing"),
  v.literal("timer"),
  v.literal("process"),
  v.literal("critical_check"),
  v.literal("conditional"),
  v.literal("spreadsheet_note")
);

export const signatureTypeValidator = v.union(
  v.literal("upload"),
  v.literal("text")
);

export const unitsValidator = v.union(
  v.literal("metric"),
  v.literal("imperial")
);

export const languageValidator = v.union(v.literal("en"), v.literal("ar"));

export const runOutcomeValidator = v.union(
  v.literal("success"),
  v.literal("failure")
);

export const versionTagValidator = v.union(
  v.literal("current"),
  v.literal("previous")
);

export const batchCodeFormatValidator = v.union(
  v.literal("prefix-seq"),
  v.literal("prefix-date-seq"),
  v.literal("prefix-random")
);

// ─── Composite Validators (Args) ─────────────────────

/** Validator for an ingredient input (used in creating/updating projects). */
export const ingredientValidator = v.object({
  id: v.string(),
  name: v.string(),
  weight: v.number(),
  unit: v.optional(v.string()),
  percentage: v.optional(v.number()),
  costPerKg: v.optional(v.number()),
});

export const spreadsheetCellValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null()
);

export const spreadsheetCellValidator = v.object({
  raw: v.string(),
  value: v.optional(spreadsheetCellValueValidator),
  display: v.optional(v.string()),
  formula: v.optional(v.string()),
  error: v.optional(v.union(v.literal("ERROR"), v.literal("REF"), v.literal("CYCLE"))),
  updatedAt: v.optional(v.number()),
  updatedBy: v.optional(v.string()),
});

export const miniSpreadsheetValidator = v.object({
  sheetKey: v.string(),
  rows: v.number(),
  cols: v.number(),
  cells: v.record(v.string(), spreadsheetCellValidator),
  revision: v.number(),
  updatedAt: v.optional(v.number()),
  updatedBy: v.optional(v.string()),
});

/** Validator for a recipe step input. */
export const stepValidator = v.object({
  id: v.string(),
  type: stepTypeValidator,
  label: v.string(),
  notes: v.optional(v.string()),
  ingredientId: v.optional(v.string()),
  expectedWeight: v.optional(v.number()),
  maxLimitPercent: v.optional(v.number()),
  actualWeight: v.optional(v.number()),
  unit: v.optional(v.string()),
  tolerance: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  processTemp: v.optional(v.number()),
  processSpeed: v.optional(v.string()),
  isCompleted: v.optional(v.boolean()),
  requiresSignOff: v.optional(v.boolean()),
  criticalParams: v.optional(
    v.array(
      v.object({
        name: v.string(),
        min: v.optional(v.number()),
        max: v.optional(v.number()),
        unit: v.optional(v.string()),
      })
    )
  ),
  onFail: v.optional(
    v.object({
      action: v.union(
        v.literal("redirect_dispose"),
        v.literal("report_reason")
      ),
      reasonPrompt: v.optional(v.string()),
    })
  ),
  spreadsheet: v.optional(miniSpreadsheetValidator),
});

/** Validator for a recipe phase input (containing steps). */
export const phaseValidator = v.object({
  id: v.string(),
  name: v.string(),
  color: v.string(),
  steps: v.array(stepValidator),
  requiresSignOff: v.optional(v.boolean()),
});

/** Validator for finishing a run with ingredient usage. */
export const runIngredientUsageValidator = v.object({
  name: v.string(),
  actualWeight: v.number(),
  unit: v.optional(v.string()),
});

// ─── Return Shape Validators ─────────────────────────
// These use v.string() for enum fields where DB document types
// widen literal unions to string. The schema already validates
// strictness at write time; these validate shape at read time.

/** Step shape as returned in enriched queries (type is string from DB) */
export const stepReturnValidator = v.object({
  id: v.string(),
  type: v.string(), // widened from literal union
  label: v.string(),
  notes: v.optional(v.string()),
  ingredientId: v.optional(v.string()),
  expectedWeight: v.optional(v.number()),
  maxLimitPercent: v.optional(v.number()),
  actualWeight: v.optional(v.number()),
  unit: v.optional(v.string()),
  tolerance: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  processTemp: v.optional(v.number()),
  processSpeed: v.optional(v.string()),
  isCompleted: v.optional(v.boolean()),
  requiresSignOff: v.optional(v.boolean()),
  criticalParams: v.optional(
    v.array(
      v.object({
        name: v.string(),
        min: v.optional(v.number()),
        max: v.optional(v.number()),
        unit: v.optional(v.string()),
      })
    )
  ),
  onFail: v.optional(
    v.object({
      action: v.union(
        v.literal("redirect_dispose"),
        v.literal("report_reason")
      ),
      reasonPrompt: v.optional(v.string()),
    })
  ),
  spreadsheet: v.optional(miniSpreadsheetValidator),
});

/** Phase shape as returned in enriched queries */
export const phaseReturnValidator = v.object({
  id: v.string(),
  name: v.string(),
  color: v.string(),
  steps: v.array(stepReturnValidator),
  requiresSignOff: v.optional(v.boolean()),
});

// ─── Document Return Validators ──────────────────────
// These describe the shapes returned by Convex queries.
// They include system fields (_id, _creationTime) via v.object.

/** Enriched project — returned by projects.list / projects.get */
export const enrichedProjectReturnValidator = v.object({
  _id: v.id("projects"),
  _creationTime: v.number(),
  name: v.string(),
  version: v.string(),
  status: v.string(), // widened from literal union
  lead: v.string(),
  description: v.string(),
  category: v.optional(v.string()),
  gsfaCategoryCode: v.optional(v.string()),
  gsfaCategoryName: v.optional(v.string()),
  formulationState: v.optional(formulationStateValidator),
  yield: v.optional(v.number()),
  batchWeight: v.optional(v.number()),
  batchCost: v.optional(v.number()),
  costPerServing: v.optional(v.number()),
  totalProjectRDCost: v.optional(v.number()),
  servingSizeMode: v.optional(servingSizeModeValidator),
  servingSizeAmount: v.optional(v.number()),
  allergenRegion: v.optional(v.string()),
  allergenReviewRequired: v.optional(v.boolean()),
  formulationAllergens: v.optional(v.array(v.string())),
  formulationAllergenOverrides: v.optional(v.record(v.string(), v.boolean())),
  formulationExtraAllergens: v.optional(v.array(v.string())),
  productType: v.optional(v.string()),
  processingMethod: v.optional(v.string()),
  targetOutcome: v.optional(v.string()),
  nutritionalGoal: v.optional(v.string()),
  testingRequirements: v.optional(v.array(v.string())),
  processingTemp: v.optional(v.number()),
  processingTime: v.optional(v.string()),
  targetTexture: v.optional(v.string()),
  updatedAt: v.string(),
  batchCodePrefix: v.optional(v.string()),
  batchCodeFormat: v.optional(v.string()),
  userId: v.optional(v.union(v.string(), v.null())),
  teamId: v.optional(v.union(v.id("teams"), v.null())),
  releaseNotes: v.optional(v.string()),
  releasedBy: v.optional(v.string()),
  releasedAt: v.optional(v.string()),
  formattedId: v.optional(v.string()),
  progress: v.optional(v.number()),
  // Enriched fields
  ingredients: v.array(ingredientValidator),
  previousVersionIngredients: v.optional(v.array(ingredientValidator)),
  phases: v.optional(v.array(phaseReturnValidator)),
  sharedRole: v.optional(v.string()),
  authorizedExecutor: v.optional(v.string()),
});

/** Enriched run — returned by runs.list / runs.get */
export const enrichedRunReturnValidator = v.object({
  _id: v.id("runs"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  projectName: v.string(),
  batchCode: v.string(),
  startTime: v.number(),
  endTime: v.optional(v.number()),
  durationString: v.string(),
  status: v.optional(v.string()),
  data: v.record(v.string(), v.number()),
  // Ensure indices are validated
  currentPhaseIndex: v.optional(v.number()),
  currentStepIndex: v.optional(v.number()),
  sensoryNotes: v.optional(v.string()),
  sensoryScores: v.optional(
    v.object({
      texture: v.number(),
      color: v.number(),
      taste: v.number(),
    })
  ),
  stepLogs: v.optional(
    v.record(
      v.string(),
      v.object({ startTime: v.number(), observation: v.string() })
    )
  ),
  runOutcome: v.optional(v.string()),
  image: v.optional(v.string()),
  userId: v.optional(v.string()),
  teamId: v.optional(v.id("teams")),
  phases: v.optional(v.array(phaseReturnValidator)),
  signoffData: v.optional(v.string()),
  signoffFont: v.optional(v.string()),
  signoffType: v.optional(v.string()),
  sharedRole: v.optional(v.string()),
});

/** Enriched inventory item — returned by inventory.list */
export const enrichedInventoryReturnValidator = v.object({
  _id: v.id("inventoryItems"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.string(),
  category: v.string(),
  batchId: v.string(),
  stock: v.number(),
  unit: v.string(),
  stockStatus: stockStatusValidator,
  expiryDate: v.string(),
  expiryStatus: v.string(),
  expiryDays: v.optional(v.number()),
  price: v.optional(v.number()),
  lowStockThreshold: v.optional(v.number()),
  supplier: v.optional(v.string()),
  storageConditions: v.optional(v.string()),
  ingredientCode: v.optional(v.string()),
  ingredientId: v.optional(v.string()),
  userId: v.optional(v.string()),
  teamId: v.optional(v.id("teams")),
  usedIn: v.array(v.object({ id: v.string(), name: v.string() })),
});

/** Lab test result — returned by labTestResults queries */
export const testResultReturnValidator = v.object({
  parameter: v.string(),
  method: v.string(),
  targetRange: v.string(),
  min: v.number(),
  max: v.number(),
  actualValue: v.number(),
  unit: v.string(),
});

/** Enriched lab report — returned by labReports queries */
export const enrichedLabReportReturnValidator = v.object({
  _id: v.id("labReports"),
  _creationTime: v.number(),
  reportId: v.string(),
  runId: v.id("runs"),
  projectId: v.id("projects"),
  projectName: v.string(),
  version: v.string(),
  lotNumber: v.string(),
  date: v.string(),
  status: labReportStatusValidator,
  leadChemist: v.string(),
  sampleType: v.string(),
  hash: v.string(),
  userId: v.optional(v.string()),
  teamId: v.optional(v.id("teams")),
  results: v.array(testResultReturnValidator),
  signoffData: v.optional(v.string()),
  signoffFont: v.optional(v.string()),
  signoffType: v.optional(v.string()),
});

/** Recent lab result — returned by labReports.getRecentResults */
export const recentLabResultReturnValidator = v.object({
  parameter: v.string(),
  value: v.string(),
  status: v.string(), // 'pass' | 'fail' — widened from literal union
});

/** Equipment document — returned by equipment.list */
export const equipmentReturnValidator = v.object({
  _id: v.id("equipment"),
  _creationTime: v.number(),
  name: v.string(),
  status: equipmentStatusValidator,
  meta: v.string(),
  user: v.optional(v.string()),
  type: equipmentTypeValidator,
  teamId: v.optional(v.id("teams")),
});

/** User settings — returned by settings.get */
export const userSettingsReturnValidator = v.object({
  _id: v.id("userSettings"),
  _creationTime: v.number(),
  settingsKey: v.string(),
  units: unitsValidator,
  darkMode: v.boolean(),
  language: languageValidator,
  appAlerts: v.boolean(),
  emailSummaries: v.boolean(),
  name: v.optional(v.string()),
  title: v.optional(v.string()),
  email: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  signatureType: v.optional(signatureTypeValidator),
  signatureData: v.optional(v.string()),
  signatureFont: v.optional(v.string()),
  profile: v.optional(v.record(v.string(), v.string())),
});

/** Team (with role) — returned by teams.list */
export const teamWithRoleReturnValidator = v.object({
  _id: v.id("teams"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  avatarUrl: v.optional(v.string()),
  ownerId: v.string(),
  createdAt: v.number(),
  autoVersioning: v.optional(v.boolean()),
  role: teamMemberRoleValidator,
});

/** Team document — returned by teams.get */
export const teamReturnValidator = v.object({
  _id: v.id("teams"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  avatarUrl: v.optional(v.string()),
  ownerId: v.string(),
  createdAt: v.number(),
  autoVersioning: v.optional(v.boolean()),
});

/** Team member document — returned by teamMembers queries */
export const teamMemberReturnValidator = v.object({
  _id: v.id("teamMembers"),
  _creationTime: v.number(),
  teamId: v.id("teams"),
  userId: v.string(),
  userName: v.string(),
  userEmail: v.string(),
  userAvatarUrl: v.optional(v.string()),
  role: teamMemberRoleValidator,
  joinedAt: v.number(),
});

/** Team invite doc — returned by teamInvites queries */
export const teamInviteReturnValidator = v.object({
  _id: v.id("teamInvites"),
  _creationTime: v.number(),
  teamId: v.id("teams"),
  email: v.string(),
  role: inviteRoleValidator,
  token: v.string(),
  status: inviteStatusValidator,
  invitedBy: v.string(),
  invitedByName: v.string(),
  createdAt: v.number(),
  expiresAt: v.optional(v.number()),
});

/** Team invite with team name — returned by teamInvites.getByToken */
export const teamInviteWithTeamReturnValidator = v.object({
  _id: v.id("teamInvites"),
  _creationTime: v.number(),
  teamId: v.id("teams"),
  email: v.string(),
  role: inviteRoleValidator,
  token: v.string(),
  status: inviteStatusValidator,
  invitedBy: v.string(),
  invitedByName: v.string(),
  createdAt: v.number(),
  expiresAt: v.optional(v.number()),
  teamName: v.string(),
});

/** Team audit log — returned by teamAuditLogs.list */
export const teamAuditLogReturnValidator = v.object({
  _id: v.id("teamAuditLogs"),
  _creationTime: v.number(),
  teamId: v.id("teams"),
  actorId: v.string(),
  actorName: v.string(),
  action: v.string(),
  targetType: v.optional(v.string()),
  targetId: v.optional(v.string()),
  targetLabel: v.optional(v.string()),
  meta: v.optional(v.record(v.string(), v.string())),
  createdAt: v.number(),
});

/** Activity document — returned by activities queries */
export const activityReturnValidator = v.object({
  _id: v.id("activities"),
  _creationTime: v.number(),
  userId: v.string(),
  action: v.string(),
  target: v.string(),
  page: v.string(),
  createdAt: v.number(),
});

/** Project ingredient document — returned by projectIngredients queries */
export const projectIngredientReturnValidator = v.object({
  _id: v.id("projectIngredients"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  ingredientKey: v.string(),
  name: v.string(),
  weight: v.number(),
  unit: v.optional(v.string()),
  percentage: v.optional(v.number()),
  costPerKg: v.optional(v.number()),
  versionTag: versionTagValidator,
  sortOrder: v.number(),
});

/** Role document */
export const roleReturnValidator = v.object({
  _id: v.id("roles"),
  _creationTime: v.number(),
  key: v.string(),
  name: v.string(),
  description: v.string(),
  permissions: v.array(v.string()),
});

/** User document */
export const userReturnValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  authUserId: v.string(),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  roleId: v.optional(v.id("roles")),
  isCreator: v.optional(v.boolean()),
});

/** User document with role populated */
export const userWithRoleReturnValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  authUserId: v.string(),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  roleId: v.optional(v.id("roles")),
  isCreator: v.optional(v.boolean()),
  role: v.optional(roleReturnValidator),
  effectivePermissions: v.array(v.string()),
});

/** Lab test result document — returned by labTestResults queries */
export const labTestResultDocReturnValidator = v.object({
  _id: v.id("labTestResults"),
  _creationTime: v.number(),
  labReportId: v.id("labReports"),
  parameter: v.string(),
  method: v.string(),
  targetRange: v.string(),
  min: v.number(),
  max: v.number(),
  actualValue: v.number(),
  unit: v.string(),
  sortOrder: v.number(),
});

/** RecipePhase with steps — returned by recipePhases.listByProject */
export const recipePhaseWithStepsReturnValidator = v.object({
  _id: v.id("recipePhases"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  phaseKey: v.string(),
  name: v.string(),
  color: v.string(),
  sortOrder: v.number(),
  steps: v.array(
    v.object({
      _id: v.id("recipeSteps"),
      _creationTime: v.number(),
      phaseId: v.id("recipePhases"),
      projectId: v.id("projects"),
      stepKey: v.string(),
      type: stepTypeValidator,
      label: v.string(),
      notes: v.optional(v.string()),
      ingredientId: v.optional(v.string()),
      expectedWeight: v.optional(v.number()),
      maxLimitPercent: v.optional(v.number()),
      unit: v.optional(v.string()),
      tolerance: v.optional(v.number()),
      durationSeconds: v.optional(v.number()),
      processTemp: v.optional(v.number()),
      processSpeed: v.optional(v.string()),
      actualWeight: v.optional(v.number()),
      isCompleted: v.optional(v.boolean()),
      requiresSignOff: v.optional(v.boolean()),
      criticalParams: v.optional(
        v.array(
          v.object({
            name: v.string(),
            min: v.optional(v.number()),
            max: v.optional(v.number()),
            unit: v.optional(v.string()),
          })
        )
      ),
      sortOrder: v.number(),
      onFail: v.optional(
        v.object({
          action: v.union(
            v.literal("redirect_dispose"),
            v.literal("report_reason")
          ),
          reasonPrompt: v.optional(v.string()),
        })
      ),
      spreadsheet: v.optional(miniSpreadsheetValidator),
    })
  ),
});

/** Material usage log — returned by inventory.getUsageHistory */
export const materialUsageLogReturnValidator = v.object({
  _id: v.id("materialUsageLogs"),
  _creationTime: v.number(),
  inventoryItemId: v.id("inventoryItems"),
  materialName: v.string(),
  runId: v.id("runs"),
  projectId: v.id("projects"),
  projectName: v.string(),
  batchCode: v.string(),
  quantityUsed: v.number(),
  unit: v.string(),
  createdAt: v.number(),
});

// ─── Schema-level Validators ─────────────────────────
// Used in schema.ts for previously v.any() fields.

/** Legacy ingredients shape (projects.ingredients — deprecated) */
export const legacyIngredientsValidator = v.optional(
  v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      weight: v.number(),
      unit: v.optional(v.string()),
      percentage: v.optional(v.number()),
      costPerKg: v.optional(v.number()),
    })
  )
);

/** Audit log meta — arbitrary key-value metadata */
export const auditLogMetaValidator = v.optional(
  v.record(v.string(), v.string())
);

/** Deprecated user profile — was a catch-all object */
export const legacyProfileValidator = v.optional(
  v.record(v.string(), v.string())
);

/** Project version snapshot data — subset of project fields */
export const versionSnapshotDataValidator = v.object({
  name: v.string(),
  version: v.string(),
  status: v.string(), // widened from literal union
  lead: v.string(),
  description: v.string(),
  category: v.optional(v.string()),
  gsfaCategoryCode: v.optional(v.string()),
  gsfaCategoryName: v.optional(v.string()),
  formulationState: v.optional(formulationStateValidator),
  yield: v.optional(v.number()),
  batchWeight: v.optional(v.number()),
  batchCost: v.optional(v.number()),
  costPerServing: v.optional(v.number()),
  totalProjectRDCost: v.optional(v.number()),
  servingSizeMode: v.optional(servingSizeModeValidator),
  servingSizeAmount: v.optional(v.number()),
  allergenRegion: v.optional(v.string()),
  allergenReviewRequired: v.optional(v.boolean()),
  formulationAllergens: v.optional(v.array(v.string())),
  formulationAllergenOverrides: v.optional(v.record(v.string(), v.boolean())),
  formulationExtraAllergens: v.optional(v.array(v.string())),
  releaseNotes: v.optional(v.string()),
  productType: v.optional(v.string()),
  processingMethod: v.optional(v.string()),
  targetOutcome: v.optional(v.string()),
  nutritionalGoal: v.optional(v.string()),
  testingRequirements: v.optional(v.array(v.string())),
  processingTemp: v.optional(v.number()),
  processingTime: v.optional(v.string()),
  targetTexture: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
  batchCodePrefix: v.optional(v.string()),
  batchCodeFormat: v.optional(v.string()),
  userId: v.optional(v.union(v.string(), v.null())),
  teamId: v.optional(v.union(v.id("teams"), v.null())),
  releasedBy: v.optional(v.string()),
  releasedAt: v.optional(v.string()),
  formattedId: v.optional(v.string()),
  createdAt: v.optional(v.number()),
  createdBy: v.optional(v.string()),
  ingredients: v.optional(
    v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        weight: v.number(),
        unit: v.optional(v.string()),
        percentage: v.optional(v.number()),
        costPerKg: v.optional(v.number()),
      })
    )
  ),
  progress: v.optional(v.number()),
  authorizedExecutor: v.optional(v.string()),
});

/** Project version snapshot ingredients — array of projectIngredient docs */
export const versionSnapshotIngredientsValidator = v.array(
  v.object({
    _id: v.id("projectIngredients"),
    _creationTime: v.number(),
    projectId: v.id("projects"),
    ingredientKey: v.string(),
    name: v.string(),
    weight: v.number(),
    unit: v.optional(v.string()),
    percentage: v.optional(v.number()),
    costPerKg: v.optional(v.number()),
    versionTag: versionTagValidator,
    sortOrder: v.number(),
  })
);

/** Project version snapshot phases — array of phase docs with nested steps */
export const versionSnapshotPhasesValidator = v.array(
  v.object({
    _id: v.id("recipePhases"),
    _creationTime: v.number(),
    projectId: v.id("projects"),
    phaseKey: v.string(),
    name: v.string(),
    color: v.string(),
    sortOrder: v.number(),
    steps: v.array(
      v.object({
        _id: v.id("recipeSteps"),
        _creationTime: v.number(),
        phaseId: v.id("recipePhases"),
        projectId: v.id("projects"),
        stepKey: v.string(),
        type: v.string(), // snapshot may contain older types
        label: v.string(),
        notes: v.optional(v.string()),
        ingredientId: v.optional(v.string()),
        expectedWeight: v.optional(v.number()),
        maxLimitPercent: v.optional(v.number()),
        unit: v.optional(v.string()),
        tolerance: v.optional(v.number()),
        durationSeconds: v.optional(v.number()),
        processTemp: v.optional(v.number()),
        processSpeed: v.optional(v.string()),
        actualWeight: v.optional(v.number()),
        isCompleted: v.optional(v.boolean()),
        requiresSignOff: v.optional(v.boolean()),
        criticalParams: v.optional(
          v.array(
            v.object({
              name: v.string(),
              min: v.optional(v.number()),
              max: v.optional(v.number()),
              unit: v.optional(v.string()),
            })
          )
        ),
        sortOrder: v.number(),
        onFail: v.optional(
          v.object({
            action: v.union(
              v.literal("redirect_dispose"),
              v.literal("report_reason")
            ),
            reasonPrompt: v.optional(v.string()),
          })
        ),
        spreadsheet: v.optional(miniSpreadsheetValidator),
      })
    ),
  })
);

/** Project version document — returned by projectVersions queries */
export const projectVersionReturnValidator = v.object({
  _id: v.id("projectVersions"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  version: v.string(),
  name: v.optional(v.string()),
  data: versionSnapshotDataValidator,
  ingredients: v.array(projectIngredientReturnValidator),
  phases: versionSnapshotPhasesValidator,
  createdAt: v.number(),
  createdBy: v.string(),
  releaseNotes: v.optional(v.string()),
  status: v.optional(v.string()),
  releasedBy: v.optional(v.string()),
  releasedAt: v.optional(v.string()),
  formattedId: v.optional(v.string()),
});
