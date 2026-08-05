import { type Infer, v } from "convex/values";

const nullableStringValidator = v.union(v.string(), v.null());

export const hotUpdaterPatchValidator = v.object({
  baseBundleId: v.string(),
  baseFileHash: v.string(),
  patchFileHash: v.string(),
  patchStorageUri: v.string(),
});

export const hotUpdaterBundleFieldsValidator = v.object({
  platform: v.union(v.literal("ios"), v.literal("android")),
  shouldForceUpdate: v.boolean(),
  enabled: v.boolean(),
  fileHash: v.string(),
  storageUri: v.string(),
  gitCommitHash: nullableStringValidator,
  message: nullableStringValidator,
  channel: v.string(),
  targetAppVersion: nullableStringValidator,
  fingerprintHash: nullableStringValidator,
  metadata: v.optional(
    v.object({
      app_version: v.optional(v.string()),
    }),
  ),
  manifestStorageUri: v.optional(nullableStringValidator),
  manifestFileHash: v.optional(nullableStringValidator),
  assetBaseStorageUri: v.optional(nullableStringValidator),
  patchBaseBundleId: v.optional(nullableStringValidator),
  patchBaseFileHash: v.optional(nullableStringValidator),
  patchFileHash: v.optional(nullableStringValidator),
  patchStorageUri: v.optional(nullableStringValidator),
  rolloutCohortCount: v.optional(v.union(v.number(), v.null())),
  targetCohorts: v.optional(v.union(v.array(v.string()), v.null())),
});

export const hotUpdaterBundleValidator = hotUpdaterBundleFieldsValidator.extend({
  id: v.string(),
  patches: v.optional(v.union(v.array(hotUpdaterPatchValidator), v.null())),
});

export const hotUpdaterBundleDocumentValidator = hotUpdaterBundleFieldsValidator.extend({
  bundleId: v.string(),
});

export const hotUpdaterBundlePatchDocumentValidator = hotUpdaterPatchValidator.extend({
  bundleId: v.string(),
});

export const hotUpdaterPaginationValidator = v.object({
  total: v.number(),
  hasNextPage: v.boolean(),
  hasPreviousPage: v.boolean(),
  currentPage: v.number(),
  totalPages: v.number(),
  nextCursor: v.optional(v.union(v.string(), v.null())),
  previousCursor: v.optional(v.union(v.string(), v.null())),
});

export const hotUpdaterPaginatedResultValidator = v.object({
  data: v.array(hotUpdaterBundleValidator),
  pagination: hotUpdaterPaginationValidator,
});

export type HotUpdaterBundle = Infer<typeof hotUpdaterBundleValidator>;
export type HotUpdaterPatch = Infer<typeof hotUpdaterPatchValidator>;
