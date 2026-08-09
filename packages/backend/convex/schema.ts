import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  hotUpdaterBundleDocumentValidator,
  hotUpdaterBundlePatchDocumentValidator,
} from "./hotUpdaterValidators";
import {
  auditLogMetaValidator,
  batchCodeFormatValidator,
  equipmentStatusValidator,
  equipmentTypeValidator,
  formulationStateValidator,
  inviteRoleValidator,
  inviteStatusValidator,
  labReportStatusValidator,
  languageValidator,
  legacyIngredientsValidator,
  legacyProfileValidator,
  localizedStringValidator,
  miniSpreadsheetValidator,
  organizationMemberRoleValidator,
  productionHallCodeValidator,
  productionLineCheckKeyValidator,
  productionLineMeasurementUnitValidator,
  productionLineReadingKeyValidator,
  productionLineRecordStatusValidator,
  productionLineSpecificationStatusValidator,
  projectStatusValidator,
  runOutcomeValidator,
  servingSizeModeValidator,
  servingSizeUnitValidator,
  sharedEntityTypeValidator,
  sharedRoleValidator,
  signatureTypeValidator,
  stepTypeValidator,
  stockStatusValidator,
  themePreferenceValidator,
  unitsValidator,
  versionSnapshotDataValidator,
  versionSnapshotIngredientsValidator,
  versionSnapshotPhasesValidator,
  versionTagValidator,
} from "./validators";

export default defineSchema({
  hotUpdaterBundles: defineTable(hotUpdaterBundleDocumentValidator)
    .index("by_bundleId", ["bundleId"])
    .index("by_channel_and_bundleId", ["channel", "bundleId"])
    .index("by_platform_and_bundleId", ["platform", "bundleId"])
    .index("by_platform_and_channel_and_bundleId", ["platform", "channel", "bundleId"]),

  hotUpdaterBundlePatches: defineTable(hotUpdaterBundlePatchDocumentValidator).index(
    "by_bundleId_and_baseBundleId",
    ["bundleId", "baseBundleId"],
  ),

  hotUpdaterChannels: defineTable({
    channel: v.string(),
  }).index("by_channel", ["channel"]),

  projects: defineTable({
    name: v.string(),
    nameI18n: v.optional(localizedStringValidator),
    version: v.string(),
    status: projectStatusValidator,
    lead: v.string(),
    description: v.string(),
    descriptionI18n: v.optional(localizedStringValidator),
    photoStorageId: v.optional(v.id("_storage")),
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
    updatedAt: v.optional(v.string()),
    // Batch code configuration
    batchCodePrefix: v.optional(v.string()),
    batchCodeFormat: v.optional(batchCodeFormatValidator),
    // Multi-user organization support.
    userId: v.optional(v.union(v.string(), v.null())),
    organizationId: v.optional(v.union(v.id("organizations"), v.null())),
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
    .index("by_userId_status", ["userId", "status"])
    .index("by_organizationId", ["organizationId"])
    .index("by_organizationId_and_status", ["organizationId", "status"]),

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
    resolvedById: v.optional(v.string()),
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
    nameI18n: v.optional(localizedStringValidator),
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
    nameI18n: v.optional(localizedStringValidator),
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
    labelI18n: v.optional(localizedStringValidator),
    notes: v.optional(v.string()),
    notesI18n: v.optional(localizedStringValidator),
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
        }),
      ),
    ),
    sortOrder: v.number(),
    onFail: v.optional(
      v.object({
        action: v.union(v.literal("redirect_dispose"), v.literal("report_reason")),
        reasonPrompt: v.optional(v.string()),
      }),
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
    parameterI18n: v.optional(localizedStringValidator),
    method: v.string(),
    methodI18n: v.optional(localizedStringValidator),
    // Deprecated legacy storage fields. Current clients and mutations do not
    // read or write them; keeping them optional allows old documents to pass
    // schema validation until a separate data cleanup migration is completed.
    targetRange: v.optional(v.string()),
    targetRangeI18n: v.optional(localizedStringValidator),
    min: v.number(),
    max: v.number(),
    actualValue: v.number(),
    unit: v.string(),
    sortOrder: v.number(),
  }).index("by_labReportId", ["labReportId"]),

  inventoryItems: defineTable({
    name: v.string(),
    nameI18n: v.optional(localizedStringValidator),
    description: v.string(),
    descriptionI18n: v.optional(localizedStringValidator),
    category: v.string(),
    categoryI18n: v.optional(localizedStringValidator),
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
    supplierI18n: v.optional(localizedStringValidator),
    storageConditions: v.optional(v.string()),
    storageConditionsI18n: v.optional(localizedStringValidator),
    ingredientCode: v.optional(v.string()), // Kept for indexing/legacy
    ingredientId: v.id("ingredients"), // Strict 1:N relationship with library required
    userId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    usedIn: v.optional(v.array(v.string())),
  })
    .index("by_category", ["category"])
    .index("by_stockStatus", ["stockStatus"])
    .index("by_organizationId", { fields: ["organizationId"], staged: true })
    .index("by_userId", { fields: ["userId"], staged: true })
    .searchIndex("search_name", { searchField: "name" }),

  // ─── Food Tech: Ingredient Library (Schema Phase 2) ────────
  ingredients: defineTable({
    name: v.string(),
    nameI18n: v.optional(localizedStringValidator),
    commonName: v.optional(v.string()),
    commonNameI18n: v.optional(localizedStringValidator),
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
    costPerKg: v.optional(v.float64()),
    // @deprecated - older records may still carry this value.
    price: v.optional(v.number()),
    nutrientValues: v.optional(
      v.array(
        v.object({
          nutrientName: v.string(),
          value: v.number(),
          unit: v.string(),
        }),
      ),
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
        }),
      ),
    ),
    isComposite: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("Draft"), v.literal("Approved"))),
    subIngredients: v.optional(
      v.array(
        v.object({
          ingredientId: v.id("ingredients"),
          percentage: v.number(),
        }),
      ),
    ),
    outOfSync: v.optional(v.boolean()),
    coverImageId: v.optional(v.id("_storage")),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_userId", { fields: ["userId"], staged: true })
    .index("by_normalizedInsNumber", ["normalizedInsNumber"])
    .searchIndex("search_name", { searchField: "name" }),

  foodCategories: defineTable({
    code: v.string(),
    name: v.string(),
    nameI18n: v.optional(localizedStringValidator),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .searchIndex("search_name", { searchField: "name" }),

  foodAdditives: defineTable({
    name: v.string(),
    nameI18n: v.optional(localizedStringValidator),
    insNumber: v.string(),
    normalizedInsNumber: v.string(),
    sourceENumber: v.optional(v.string()),
    plainInsNumber: v.optional(v.number()),
    codexId: v.optional(v.number()),
    groupName: v.optional(v.string()),
    groupNameI18n: v.optional(localizedStringValidator),
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
    .index("by_categoryCode_normalizedInsNumber", ["categoryCode", "normalizedInsNumber"])
    .index("by_normalizedInsNumber", ["normalizedInsNumber"])
    .index("by_foodCategoryId", ["foodCategoryId"]),

  labReports: defineTable({
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
    userId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    signoffData: v.optional(v.string()),
    signoffFont: v.optional(v.string()),
    signoffType: v.optional(signatureTypeValidator),
    signedBy: v.optional(v.string()),
    signedAt: v.optional(v.number()),
  })
    .index("by_runId", ["runId"])
    .index("by_projectId", ["projectId"])
    .index("by_status", ["status"])
    .index("by_organizationId", { fields: ["organizationId"], staged: true })
    .index("by_userId", { fields: ["userId"], staged: true }),

  equipment: defineTable({
    name: v.string(),
    status: equipmentStatusValidator,
    meta: v.string(),
    user: v.optional(v.string()),
    userId: v.optional(v.string()),
    statusUpdatedBy: v.optional(v.string()),
    statusUpdatedAt: v.optional(v.number()),
    type: equipmentTypeValidator,
    organizationId: v.optional(v.id("organizations")),
  })
    .index("by_organizationId", { fields: ["organizationId"], staged: true })
    .index("by_userId", { fields: ["userId"], staged: true }),

  runs: defineTable({
    projectId: v.id("projects"),
    projectName: v.optional(v.string()),
    projectNameI18n: v.optional(localizedStringValidator),
    batchCode: v.string(),
    startTime: v.number(), // timestamp ms
    endTime: v.optional(v.number()),
    durationString: v.optional(v.string()),
    data: v.record(v.string(), v.number()),
    status: v.optional(
      v.union(v.literal("completed"), v.literal("failed"), v.literal("In Progress")),
    ),
    failureReason: v.optional(v.string()),
    currentPhaseIndex: v.optional(v.number()),
    currentStepIndex: v.optional(v.number()),
    // Sensory & Outcome Data
    sensoryNotes: v.optional(v.string()),
    sensoryNotesI18n: v.optional(localizedStringValidator),
    sensoryScores: v.optional(
      v.object({
        texture: v.number(),
        color: v.number(),
        taste: v.number(),
      }),
    ),
    stepLogs: v.optional(
      v.record(v.string(), v.object({ startTime: v.number(), observation: v.string() })),
    ),
    runOutcome: v.optional(runOutcomeValidator),
    image: v.optional(v.string()),
    userId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    signoffData: v.optional(v.string()),
    signoffFont: v.optional(v.string()),
    signoffType: v.optional(signatureTypeValidator),
  })
    .index("by_projectId", ["projectId"])
    .index("by_status", ["status"]),

  userSettings: defineTable({
    settingsKey: v.string(), // userId
    units: unitsValidator,
    // Optional during rollout. Clients fall back to the legacy darkMode field.
    themePreference: v.optional(themePreferenceValidator),
    // @deprecated — retained for older clients that only support two modes.
    darkMode: v.boolean(),
    language: languageValidator,
    appAlerts: v.boolean(),
    emailSummaries: v.boolean(),
    // Profile Fields
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    // @deprecated — retained until existing signature settings are migrated away.
    signatureType: v.optional(signatureTypeValidator),
    signatureData: v.optional(v.string()),
    signatureFont: v.optional(v.string()),
    // @deprecated — legacy field
    profile: legacyProfileValidator,
  }).index("by_settingsKey", ["settingsKey"]),

  // ─── Organization Management ───────────────────────
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    avatarUrl: v.optional(v.string()),
    ownerId: v.string(),
    createdAt: v.number(),
    autoVersioning: v.optional(v.boolean()),
    authOrganizationId: v.optional(v.string()),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_slug", ["slug"])
    .index("by_authOrganizationId", ["authOrganizationId"]),

  // ─── Production-line monitoring ───────────────────
  productionLineSettings: defineTable({
    organizationId: v.id("organizations"),
    timezone: v.string(),
    enabledHallCodes: v.array(productionHallCodeValidator),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }).index("by_organizationId", ["organizationId"]),

  productionLineSerialCounters: defineTable({
    organizationId: v.id("organizations"),
    hallCode: productionHallCodeValidator,
    nextSequence: v.number(),
    initializedAt: v.number(),
    initializedBy: v.string(),
    lastAllocatedAt: v.optional(v.number()),
    lastAllocatedBy: v.optional(v.string()),
  }).index("by_organizationId_and_hallCode", ["organizationId", "hallCode"]),

  productionLineSpecifications: defineTable({
    organizationId: v.id("organizations"),
    productId: v.id("projects"),
    productName: v.string(),
    version: v.number(),
    status: productionLineSpecificationStatusValidator,
    createdAt: v.number(),
    createdBy: v.string(),
    effectiveAt: v.optional(v.number()),
    publishedBy: v.optional(v.string()),
  })
    .index("by_organizationId_and_productId", ["organizationId", "productId"])
    .index("by_organizationId_and_status", ["organizationId", "status"])
    .index("by_organizationId_and_productId_and_status", ["organizationId", "productId", "status"]),

  productionLineSpecificationLimits: defineTable({
    specificationId: v.id("productionLineSpecifications"),
    readingKey: productionLineReadingKeyValidator,
    unit: productionLineMeasurementUnitValidator,
    minimum: v.number(),
    maximum: v.number(),
    target: v.optional(v.number()),
    minimumReadingCount: v.number(),
  }).index("by_specificationId_and_readingKey", ["specificationId", "readingKey"]),

  productionLineReadings: defineTable({
    recordId: v.id("productionLineRecords"),
    readingKey: productionLineReadingKeyValidator,
    readingIndex: v.number(),
    value: v.number(),
    unit: productionLineMeasurementUnitValidator,
    minimum: v.number(),
    maximum: v.number(),
    target: v.optional(v.number()),
    withinLimit: v.boolean(),
    observedAt: v.number(),
    observedBy: v.string(),
    updatedAt: v.number(),
  })
    .index("by_recordId", ["recordId"])
    .index("by_recordId_and_readingKey_and_readingIndex", [
      "recordId",
      "readingKey",
      "readingIndex",
    ]),

  productionLineChecks: defineTable({
    recordId: v.id("productionLineRecords"),
    checkKey: productionLineCheckKeyValidator,
    checked: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  })
    .index("by_recordId", ["recordId"])
    .index("by_recordId_and_checkKey", ["recordId", "checkKey"]),

  productionLineRecords: defineTable({
    organizationId: v.id("organizations"),
    productionHallCode: productionHallCodeValidator,
    serialSequence: v.number(),
    displaySerial: v.string(),
    departmentName: v.string(),
    productId: v.id("projects"),
    productName: v.string(),
    inspectionAt: v.number(),
    inspectionHourKey: v.string(),
    specificationId: v.id("productionLineSpecifications"),
    specificationVersion: v.number(),
    batchLabelPhotoStorageId: v.optional(v.id("_storage")),
    batchLabelMimeType: v.optional(v.string()),
    batchLabelSize: v.optional(v.number()),
    batchLabelCapturedAt: v.optional(v.number()),
    printedBatchCode: v.optional(v.string()),
    labelProductionDate: v.optional(v.string()),
    dailyBatchSequence: v.optional(v.number()),
    batchLabelConfirmedBy: v.optional(v.string()),
    batchLabelConfirmedAt: v.optional(v.number()),
    status: productionLineRecordStatusValidator,
    editableOwnerUserId: v.string(),
    qcUserId: v.string(),
    qcUserName: v.string(),
    recordRevision: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_organizationId_and_status", ["organizationId", "status"])
    .index("by_organizationId_and_qcUserId", ["organizationId", "qcUserId"])
    .index("by_organizationId_and_productionHallCode_and_serialSequence", [
      "organizationId",
      "productionHallCode",
      "serialSequence",
    ])
    .index("by_organizationId_departmentName_productId_inspectionHourKey", [
      "organizationId",
      "departmentName",
      "productId",
      "inspectionHourKey",
    ]),

  productionLineRecordEvents: defineTable({
    recordId: v.id("productionLineRecords"),
    organizationId: v.id("organizations"),
    action: v.string(),
    actorId: v.string(),
    actorName: v.string(),
    recordRevision: v.number(),
    metadata: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
  })
    .index("by_recordId", ["recordId"])
    .index("by_organizationId_and_createdAt", ["organizationId", "createdAt"]),

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

  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    userAvatarUrl: v.optional(v.string()),
    role: organizationMemberRoleValidator,
    joinedAt: v.number(),
    authMemberId: v.optional(v.string()),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_userId", ["userId"])
    .index("by_organizationId_and_userId", ["organizationId", "userId"])
    .index("by_authMemberId", ["authMemberId"]),

  organizationInvites: defineTable({
    organizationId: v.id("organizations"),
    email: v.string(),
    role: inviteRoleValidator,
    token: v.string(),
    status: inviteStatusValidator,
    invitedBy: v.string(),
    invitedByName: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    authInvitationId: v.optional(v.string()),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_token", ["token"])
    .index("by_email", ["email"])
    .index("by_authInvitationId", ["authInvitationId"]),

  organizationAuditLogs: defineTable({
    organizationId: v.id("organizations"),
    actorId: v.string(),
    actorName: v.string(),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    targetLabel: v.optional(v.string()),
    meta: auditLogMetaValidator,
    createdAt: v.number(),
  }).index("by_organizationId", ["organizationId"]),

  // ─── Material Usage Logs ───────────────────────────
  materialUsageLogs: defineTable({
    inventoryItemId: v.id("inventoryItems"),
    materialName: v.string(),
    materialNameI18n: v.optional(localizedStringValidator),
    runId: v.id("runs"),
    projectId: v.id("projects"),
    projectName: v.string(),
    projectNameI18n: v.optional(localizedStringValidator),
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
    nameI18n: v.optional(localizedStringValidator),
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
    labelI18n: v.optional(localizedStringValidator),
    notes: v.optional(v.string()),
    notesI18n: v.optional(localizedStringValidator),
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
        }),
      ),
    ),
    sortOrder: v.number(),
    onFail: v.optional(
      v.object({
        action: v.union(v.literal("redirect_dispose"), v.literal("report_reason")),
        reasonPrompt: v.optional(v.string()),
      }),
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
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.string()),
    expiredAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_entityId", ["entityId"]),

  sharedAccess: defineTable({
    userId: v.string(), // Authenticated user ID Who redeemed the link
    entityId: v.string(),
    entityType: sharedEntityTypeValidator,
    role: sharedRoleValidator,
    grantedAt: v.number(),
    sourceLinkId: v.optional(v.id("sharedLinks")),
    expiresAt: v.optional(v.number()),
  })
    .index("by_userId_entityId", ["userId", "entityId"])
    .index("by_entityId", ["entityId"]),
});
