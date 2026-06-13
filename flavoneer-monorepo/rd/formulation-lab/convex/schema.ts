import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  auditLogMetaValidator,
  batchCodeFormatValidator,
  equipmentStatusValidator,
  equipmentTypeValidator,
  inviteRoleValidator,
  inviteStatusValidator,
  labReportStatusValidator,
  languageValidator,
  legacyIngredientsValidator,
  legacyProfileValidator,
  miniSpreadsheetValidator,
  projectStatusValidator,
  runOutcomeValidator,
  sharedEntityTypeValidator,
  sharedRoleValidator,
  signatureTypeValidator,
  stepTypeValidator,
  stockStatusValidator,
  teamMemberRoleValidator,
  unitsValidator,
  versionSnapshotDataValidator,
  versionSnapshotIngredientsValidator,
  versionSnapshotPhasesValidator,
  versionTagValidator,
} from "./validators";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    version: v.string(),
    status: projectStatusValidator,
    lead: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    gsfaCategoryCode: v.optional(v.string()),
    gsfaCategoryName: v.optional(v.string()),
    productType: v.optional(v.string()),
    processingMethod: v.optional(v.string()),
    targetOutcome: v.optional(v.string()),
    nutritionalGoal: v.optional(v.string()),
    testingRequirements: v.optional(v.array(v.string())),
    processingTemp: v.optional(v.number()),
    processingTime: v.optional(v.string()),
    targetTexture: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    // Batch code configuration
    batchCodePrefix: v.optional(v.string()),
    batchCodeFormat: v.optional(batchCodeFormatValidator),
    // Multi-user/team support
    userId: v.optional(v.union(v.string(), v.null())),
    teamId: v.optional(v.union(v.id("teams"), v.null())),
    // Approval Workflow
    releaseNotes: v.optional(v.string()),
    releasedBy: v.optional(v.string()),
    releasedAt: v.optional(v.string()),
    formattedId: v.optional(v.string()),
    // @deprecated — legacy fields kept for backward compatibility
    ingredients: legacyIngredientsValidator,
    progress: v.optional(v.number()),
    // Execution
    authorizedExecutor: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_userId", ["userId"])
    .index("by_teamId", ["teamId"])
    .index("by_teamId_status", ["teamId", "status"]),

  // ─── RBAC (Role-Based Access Control) ─────────────
  roles: defineTable({
    key: v.string(), // "admin", "editor", "supervisor", "operator"
    name: v.string(), // "Admin", "Editor", etc.
    description: v.string(),
    permissions: v.array(v.string()), // e.g., ["manage_roles", "edit_procedures", "sign_off", "execute_runs"]
  }).index("by_key", ["key"]),

  users: defineTable({
    authUserId: v.string(), // ID from betterAuth
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    roleId: v.optional(v.id("roles")), // References local roles table
    isCreator: v.optional(v.boolean()),
  }).index("by_authUserId", ["authUserId"]),

  // ─── Approval Workflow Comments ───────────────────
  comments: defineTable({
    projectId: v.id("projects"),
    phaseId: v.optional(v.string()), // null if overall recipe comment
    text: v.string(),
    authorName: v.string(),
    authorId: v.optional(v.string()),
    createdAt: v.number(),
    isResolved: v.boolean(),
    resolvedBy: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_phaseId", ["projectId", "phaseId"])
    .index("by_projectId_isResolved", ["projectId", "isResolved"]),

  // ─── Project Ingredients (extracted from projects.ingredients) ──
  projectIngredients: defineTable({
    projectId: v.id("projects"),
    ingredientKey: v.string(), // client-generated UUID
    name: v.string(),
    weight: v.number(),
    unit: v.optional(v.string()),
    percentage: v.optional(v.number()),
    costPerKg: v.optional(v.number()),
    versionTag: versionTagValidator,
    sortOrder: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_versionTag", ["projectId", "versionTag"]),

  // ─── Recipe Phases (extracted from projects.phases) ────────────
  recipePhases: defineTable({
    projectId: v.id("projects"),
    phaseKey: v.string(), // client-generated UUID
    name: v.string(),
    color: v.string(),
    sortOrder: v.number(),
  }).index("by_projectId", ["projectId"]),

  // ─── Recipe Steps (extracted from projects.phases[].steps[]) ───
  recipeSteps: defineTable({
    phaseId: v.id("recipePhases"),
    projectId: v.id("projects"), // denormalized for fast project-level queries
    stepKey: v.string(), // client-generated UUID
    type: stepTypeValidator,
    label: v.string(),
    notes: v.optional(v.string()),
    ingredientId: v.optional(v.string()),
    expectedWeight: v.optional(v.number()),
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
    .index("by_phaseId", ["phaseId"])
    .index("by_projectId", ["projectId"]),

  // ─── Step Dependencies (AND/OR Logic Links) ────────
  stepDependencies: defineTable({
    projectId: v.id("projects"),
    stepKey: v.string(), // The step that is locked
    dependsOnStepKeys: v.array(v.string()), // Keys of steps it depends on
    condition: v.union(v.literal("AND"), v.literal("OR")),
  })
    .index("by_projectId", ["projectId"])
    .index("by_stepKey", ["stepKey"]),

  // ─── Lab Test Results (extracted from labReports.results) ──────
  labTestResults: defineTable({
    labReportId: v.id("labReports"),
    parameter: v.string(),
    method: v.string(),
    targetRange: v.string(),
    min: v.number(),
    max: v.number(),
    actualValue: v.number(),
    unit: v.string(),
    sortOrder: v.number(),
  }).index("by_labReportId", ["labReportId"]),

  inventoryItems: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
    batchId: v.string(),
    stock: v.number(),
    unit: v.string(),
    stockStatus: stockStatusValidator,
    expiryDate: v.string(),
    expiryStatus: v.optional(v.string()),
    expiryDays: v.optional(v.number()),
    price: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    supplier: v.optional(v.string()),
    storageConditions: v.optional(v.string()),
    ingredientCode: v.optional(v.string()), // Kept for indexing/legacy
    ingredientId: v.id("ingredients"), // Strict 1:N relationship with library required
    userId: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    usedIn: v.optional(v.array(v.string())),
  })
    .index("by_category", ["category"])
    .index("by_stockStatus", ["stockStatus"])
    .searchIndex("search_name", { searchField: "name" }),

  // ─── Food Tech: Ingredient Library (Schema Phase 2) ────────
  ingredients: defineTable({
    name: v.string(),
    commonName: v.optional(v.string()),
    groupId: v.optional(v.string()),
    isnAr: v.optional(v.string()),
    isnEn: v.optional(v.string()),
    code: v.optional(v.string()),
    isAdditive: v.optional(v.boolean()),
    insNumber: v.optional(v.string()),
    normalizedInsNumber: v.optional(v.string()),
    foodAdditiveId: v.optional(v.id("foodAdditives")),
    yieldAmount: v.number(), // Percentage e.g. 100
    moistureLoss: v.number(), // Percentage e.g. 0
    nutrientValues: v.optional(
      v.array(
        v.object({
          nutrientName: v.string(),
          value: v.number(),
          unit: v.string(),
        })
      )
    ),
    allergenValues: v.optional(v.array(v.string())),
    allergenRegion: v.optional(v.string()),
    allergenVerified: v.optional(v.boolean()),
    subAllergenValues: v.optional(v.record(v.string(), v.array(v.string()))),
    density: v.optional(v.number()),
    conversions: v.optional(
      v.array(
        v.object({
          unit: v.string(),
          grams: v.number(),
        })
      )
    ),
    isComposite: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("Draft"), v.literal("Approved"))),
    subIngredients: v.optional(
      v.array(
        v.object({
          ingredientId: v.id("ingredients"),
          percentage: v.number(),
        })
      )
    ),
    outOfSync: v.optional(v.boolean()),
    coverImageId: v.optional(v.id("_storage")),
    teamId: v.optional(v.id("teams")),
    userId: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_teamId", ["teamId"])
    .index("by_normalizedInsNumber", ["normalizedInsNumber"])
    .searchIndex("search_name", { searchField: "name" }),

  foodCategories: defineTable({
    code: v.string(),
    name: v.string(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .searchIndex("search_name", { searchField: "name" }),

  foodAdditives: defineTable({
    name: v.string(),
    insNumber: v.string(),
    normalizedInsNumber: v.string(),
    sourceENumber: v.optional(v.string()),
    plainInsNumber: v.optional(v.number()),
    codexId: v.optional(v.number()),
    groupName: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_normalizedInsNumber", ["normalizedInsNumber"])
    .searchIndex("search_name", { searchField: "name" }),

  additiveLimits: defineTable({
    additiveId: v.id("foodAdditives"),
    foodCategoryId: v.id("foodCategories"),
    categoryCode: v.string(),
    normalizedInsNumber: v.string(),
    mgPerKg: v.number(),
    source: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_categoryCode_normalizedInsNumber", [
      "categoryCode",
      "normalizedInsNumber",
    ])
    .index("by_normalizedInsNumber", ["normalizedInsNumber"])
    .index("by_foodCategoryId", ["foodCategoryId"]),

  labReports: defineTable({
    reportId: v.string(),
    runId: v.id("runs"),
    projectId: v.id("projects"),
    projectName: v.optional(v.string()),
    version: v.string(),
    lotNumber: v.string(),
    date: v.string(),
    status: labReportStatusValidator,
    leadChemist: v.string(),
    sampleType: v.string(),
    hash: v.string(),
    userId: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    signoffData: v.optional(v.string()),
    signoffFont: v.optional(v.string()),
    signoffType: v.optional(signatureTypeValidator),
  })
    .index("by_runId", ["runId"])
    .index("by_projectId", ["projectId"])
    .index("by_status", ["status"]),

  equipment: defineTable({
    name: v.string(),
    status: equipmentStatusValidator,
    meta: v.string(),
    user: v.optional(v.string()),
    type: equipmentTypeValidator,
    teamId: v.optional(v.id("teams")),
  }),

  runs: defineTable({
    projectId: v.id("projects"),
    projectName: v.optional(v.string()),
    batchCode: v.string(),
    startTime: v.number(), // timestamp ms
    endTime: v.optional(v.number()),
    durationString: v.optional(v.string()),
    data: v.record(v.string(), v.number()),
    status: v.optional(
      v.union(
        v.literal("completed"),
        v.literal("failed"),
        v.literal("In Progress")
      )
    ),
    failureReason: v.optional(v.string()),
    currentPhaseIndex: v.optional(v.number()),
    currentStepIndex: v.optional(v.number()),
    // Sensory & Outcome Data
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
    runOutcome: v.optional(runOutcomeValidator),
    image: v.optional(v.string()),
    userId: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    signoffData: v.optional(v.string()),
    signoffFont: v.optional(v.string()),
    signoffType: v.optional(signatureTypeValidator),
  })
    .index("by_projectId", ["projectId"])
    .index("by_status", ["status"]),

  userSettings: defineTable({
    settingsKey: v.string(), // userId
    units: unitsValidator,
    darkMode: v.boolean(),
    language: languageValidator,
    appAlerts: v.boolean(),
    emailSummaries: v.boolean(),
    // Profile Fields
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    signatureType: v.optional(signatureTypeValidator),
    signatureData: v.optional(v.string()),
    signatureFont: v.optional(v.string()),
    // @deprecated — legacy field
    profile: legacyProfileValidator,
  }).index("by_settingsKey", ["settingsKey"]),

  // ─── Team Management ───────────────────────────────
  teams: defineTable({
    name: v.string(),
    slug: v.string(),
    avatarUrl: v.optional(v.string()),
    ownerId: v.string(), // auth user ID who created the team
    createdAt: v.number(),
    autoVersioning: v.optional(v.boolean()),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_slug", ["slug"]),

  projectVersions: defineTable({
    projectId: v.id("projects"),
    version: v.string(),
    name: v.optional(v.string()),
    data: versionSnapshotDataValidator,
    ingredients: versionSnapshotIngredientsValidator,
    phases: versionSnapshotPhasesValidator,
    createdAt: v.number(),
    createdBy: v.string(),
    releaseNotes: v.optional(v.string()),
    status: v.optional(v.string()),
    releasedBy: v.optional(v.string()),
    releasedAt: v.optional(v.string()),
    formattedId: v.optional(v.string()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_version", ["projectId", "version"]),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    userAvatarUrl: v.optional(v.string()),
    role: teamMemberRoleValidator,
    joinedAt: v.number(),
  })
    .index("by_teamId", ["teamId"])
    .index("by_userId", ["userId"])
    .index("by_teamId_userId", ["teamId", "userId"]),

  teamInvites: defineTable({
    teamId: v.id("teams"),
    email: v.string(),
    role: inviteRoleValidator,
    token: v.string(),
    status: inviteStatusValidator,
    invitedBy: v.string(),
    invitedByName: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_teamId", ["teamId"])
    .index("by_token", ["token"])
    .index("by_email", ["email"]),

  teamAuditLogs: defineTable({
    teamId: v.id("teams"),
    actorId: v.string(),
    actorName: v.string(),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    targetLabel: v.optional(v.string()),
    meta: auditLogMetaValidator,
    createdAt: v.number(),
  }).index("by_teamId", ["teamId"]),

  // ─── Material Usage Logs ───────────────────────────
  materialUsageLogs: defineTable({
    inventoryItemId: v.id("inventoryItems"),
    materialName: v.string(),
    runId: v.id("runs"),
    projectId: v.id("projects"),
    projectName: v.string(),
    batchCode: v.string(),
    quantityUsed: v.number(),
    unit: v.string(),
    createdAt: v.number(),
  })
    .index("by_inventoryItemId", ["inventoryItemId"])
    .index("by_runId", ["runId"]),

  // ─── Run Phases (snapshot of recipe at run time) ───
  runPhases: defineTable({
    runId: v.id("runs"),
    phaseKey: v.string(),
    name: v.string(),
    color: v.string(),
    sortOrder: v.number(),
  }).index("by_runId", ["runId"]),

  // ─── Run Steps (snapshot of recipe steps at run time) ───
  runSteps: defineTable({
    runId: v.id("runs"),
    runPhaseId: v.id("runPhases"),
    stepKey: v.string(),
    type: v.string(),
    label: v.string(),
    notes: v.optional(v.string()),
    ingredientId: v.optional(v.string()),
    expectedWeight: v.optional(v.number()),
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
    .index("by_runId", ["runId"])
    .index("by_runPhaseId", ["runPhaseId"]),

  // ─── Sensory Analysis ─────────────────────────────
  sensoryForms: defineTable({
    projectId: v.id("projects"),
    runId: v.id("runs"),
    name: v.string(),
    schemaJSON: v.string(), // Minimalist dynamic schema
    token: v.string(), // Public share token
    createdAt: v.number(),
    createdBy: v.string(),
  })
    .index("by_runId", ["runId"])
    .index("by_token", ["token"]),

  sensoryEvaluations: defineTable({
    formId: v.id("sensoryForms"),
    testerName: v.string(),
    resultsJSON: v.string(), // The submitted scores
    createdAt: v.number(),
  }).index("by_formId", ["formId"]),

  // ─── User Activity Logs ───────────────────────────
  activities: defineTable({
    userId: v.string(),
    action: v.string(),
    target: v.string(),
    page: v.string(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ─── System Configuration ─────────────────────────
  systemConfig: defineTable({
    configKey: v.string(), // e.g., "traceability" or "versionControl"
    idPrefix: v.optional(v.string()), // e.g., "FD-"
    currentIdNumber: v.optional(v.number()), // e.g., 1
    versionPrefix: v.optional(v.string()),
    versionStyle: v.optional(v.string()),
    autoIncrementVersion: v.optional(v.boolean()),
  }).index("by_configKey", ["configKey"]),

  // ─── Sharing & Permissions ────────────────────────
  sharedLinks: defineTable({
    entityId: v.string(), // ID of the Project or Run
    entityType: sharedEntityTypeValidator,
    token: v.string(), // Unique secret token for the URL
    role: sharedRoleValidator, // 'viewer' | 'editor'
    createdBy: v.string(), // Auth userId who created the link
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_token", ["token"])
    .index("by_entityId", ["entityId"]),

  sharedAccess: defineTable({
    userId: v.string(), // Authenticated user ID Who redeemed the link
    entityId: v.string(),
    entityType: sharedEntityTypeValidator,
    role: sharedRoleValidator,
    grantedAt: v.number(),
  })
    .index("by_userId_entityId", ["userId", "entityId"])
    .index("by_entityId", ["entityId"]),
});
