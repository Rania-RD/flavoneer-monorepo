import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  type HotUpdaterBundle,
  hotUpdaterBundleValidator,
  hotUpdaterPaginatedResultValidator,
} from "./hotUpdaterValidators";

const nullableStringValidator = v.union(v.string(), v.null());
const MAX_MANAGEMENT_SCAN = 500;
const MAX_PATCHES_PER_BUNDLE = 100;

async function hydrateBundle(
  ctx: QueryCtx,
  document: Doc<"hotUpdaterBundles">,
): Promise<HotUpdaterBundle> {
  const patches = await ctx.db
    .query("hotUpdaterBundlePatches")
    .withIndex("by_bundleId_and_baseBundleId", (query) => query.eq("bundleId", document.bundleId))
    .take(MAX_PATCHES_PER_BUNDLE);

  const { _id, _creationTime, bundleId, ...fields } = document;
  return {
    id: bundleId,
    ...fields,
    patches: patches.map(({ baseBundleId, baseFileHash, patchFileHash, patchStorageUri }) => ({
      baseBundleId,
      baseFileHash,
      patchFileHash,
      patchStorageUri,
    })),
  };
}

async function replaceBundlePatches(ctx: MutationCtx, bundle: HotUpdaterBundle) {
  const existingPatches = ctx.db
    .query("hotUpdaterBundlePatches")
    .withIndex("by_bundleId_and_baseBundleId", (query) => query.eq("bundleId", bundle.id));

  for await (const patch of existingPatches) {
    await ctx.db.delete("hotUpdaterBundlePatches", patch._id);
  }

  for (const patch of bundle.patches ?? []) {
    await ctx.db.insert("hotUpdaterBundlePatches", {
      bundleId: bundle.id,
      ...patch,
    });
  }
}

async function upsertBundle(ctx: MutationCtx, bundle: HotUpdaterBundle) {
  const existing = await ctx.db
    .query("hotUpdaterBundles")
    .withIndex("by_bundleId", (query) => query.eq("bundleId", bundle.id))
    .unique();
  const { id, patches: _patches, ...fields } = bundle;

  if (existing) {
    await ctx.db.replace("hotUpdaterBundles", existing._id, {
      bundleId: id,
      ...fields,
    });
  } else {
    await ctx.db.insert("hotUpdaterBundles", {
      bundleId: id,
      ...fields,
    });
  }

  await replaceBundlePatches(ctx, bundle);

  const channel = await ctx.db
    .query("hotUpdaterChannels")
    .withIndex("by_channel", (query) => query.eq("channel", bundle.channel))
    .unique();
  if (!channel) {
    await ctx.db.insert("hotUpdaterChannels", { channel: bundle.channel });
  }
}

export const upsertBundles = internalMutation({
  args: {
    bundles: v.array(hotUpdaterBundleValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const bundle of args.bundles) {
      await upsertBundle(ctx, bundle);
    }
    return null;
  },
});

export const deleteBundle = internalMutation({
  args: {
    bundleId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const bundle = await ctx.db
      .query("hotUpdaterBundles")
      .withIndex("by_bundleId", (query) => query.eq("bundleId", args.bundleId))
      .unique();
    if (!bundle) {
      return false;
    }

    const patches = ctx.db
      .query("hotUpdaterBundlePatches")
      .withIndex("by_bundleId_and_baseBundleId", (query) => query.eq("bundleId", args.bundleId));
    for await (const patch of patches) {
      await ctx.db.delete("hotUpdaterBundlePatches", patch._id);
    }
    await ctx.db.delete("hotUpdaterBundles", bundle._id);

    const remainingBundle = await ctx.db
      .query("hotUpdaterBundles")
      .withIndex("by_channel_and_bundleId", (query) => query.eq("channel", bundle.channel))
      .first();
    if (!remainingBundle) {
      const channel = await ctx.db
        .query("hotUpdaterChannels")
        .withIndex("by_channel", (query) => query.eq("channel", bundle.channel))
        .unique();
      if (channel) {
        await ctx.db.delete("hotUpdaterChannels", channel._id);
      }
    }
    return true;
  },
});

export const pruneUnusedChannels = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const channels = await ctx.db.query("hotUpdaterChannels").withIndex("by_channel").take(100);
    let deleted = 0;
    for (const channel of channels) {
      const bundle = await ctx.db
        .query("hotUpdaterBundles")
        .withIndex("by_channel_and_bundleId", (query) => query.eq("channel", channel.channel))
        .first();
      if (!bundle) {
        await ctx.db.delete("hotUpdaterChannels", channel._id);
        deleted += 1;
      }
    }
    return deleted;
  },
});

export const getBundle = internalQuery({
  args: {
    bundleId: v.string(),
  },
  returns: v.union(hotUpdaterBundleValidator, v.null()),
  handler: async (ctx, args) => {
    const bundle = await ctx.db
      .query("hotUpdaterBundles")
      .withIndex("by_bundleId", (query) => query.eq("bundleId", args.bundleId))
      .unique();
    return bundle ? await hydrateBundle(ctx, bundle) : null;
  },
});

export const getUpdateCandidates = internalQuery({
  args: {
    platform: v.union(v.literal("ios"), v.literal("android")),
    channel: v.string(),
    minBundleId: v.string(),
  },
  returns: v.array(hotUpdaterBundleValidator),
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("hotUpdaterBundles")
      .withIndex("by_platform_and_channel_and_bundleId", (query) =>
        query
          .eq("platform", args.platform)
          .eq("channel", args.channel)
          .gte("bundleId", args.minBundleId),
      )
      .order("desc")
      .take(200);

    const bundles: HotUpdaterBundle[] = [];
    for (const document of documents) {
      bundles.push(await hydrateBundle(ctx, document));
    }
    return bundles;
  },
});

export const getChannels = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const channels = await ctx.db.query("hotUpdaterChannels").withIndex("by_channel").take(100);
    return channels.map(({ channel }) => channel);
  },
});

export const listBundles = internalQuery({
  args: {
    channel: v.optional(v.string()),
    platform: v.optional(v.union(v.literal("ios"), v.literal("android"))),
    enabled: v.optional(v.boolean()),
    targetAppVersion: v.optional(nullableStringValidator),
    targetAppVersionIn: v.optional(v.array(v.string())),
    targetAppVersionNotNull: v.optional(v.boolean()),
    fingerprintHash: v.optional(nullableStringValidator),
    idEq: v.optional(v.string()),
    idGt: v.optional(v.string()),
    idGte: v.optional(v.string()),
    idLt: v.optional(v.string()),
    idLte: v.optional(v.string()),
    idIn: v.optional(v.array(v.string())),
    after: v.optional(v.string()),
    before: v.optional(v.string()),
    limit: v.number(),
    page: v.optional(v.number()),
  },
  returns: hotUpdaterPaginatedResultValidator,
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("hotUpdaterBundles")
      .withIndex("by_bundleId")
      .order("desc")
      .take(MAX_MANAGEMENT_SCAN);
    const idSet = args.idIn ? new Set(args.idIn) : null;
    const versionSet = args.targetAppVersionIn ? new Set(args.targetAppVersionIn) : null;

    const filtered = documents.filter((bundle) => {
      if (args.channel !== undefined && bundle.channel !== args.channel) {
        return false;
      }
      if (args.platform !== undefined && bundle.platform !== args.platform) {
        return false;
      }
      if (args.enabled !== undefined && bundle.enabled !== args.enabled) {
        return false;
      }
      if (
        args.targetAppVersion !== undefined &&
        bundle.targetAppVersion !== args.targetAppVersion
      ) {
        return false;
      }
      if (versionSet && !versionSet.has(bundle.targetAppVersion ?? "")) {
        return false;
      }
      if (
        args.targetAppVersionNotNull !== undefined &&
        (bundle.targetAppVersion !== null) !== args.targetAppVersionNotNull
      ) {
        return false;
      }
      if (args.fingerprintHash !== undefined && bundle.fingerprintHash !== args.fingerprintHash) {
        return false;
      }
      if (args.idEq !== undefined && bundle.bundleId !== args.idEq) {
        return false;
      }
      if (args.idGt !== undefined && bundle.bundleId <= args.idGt) {
        return false;
      }
      if (args.idGte !== undefined && bundle.bundleId < args.idGte) {
        return false;
      }
      if (args.idLt !== undefined && bundle.bundleId >= args.idLt) {
        return false;
      }
      if (args.idLte !== undefined && bundle.bundleId > args.idLte) {
        return false;
      }
      if (idSet && !idSet.has(bundle.bundleId)) {
        return false;
      }
      if (args.after !== undefined && bundle.bundleId >= args.after) {
        return false;
      }
      if (args.before !== undefined && bundle.bundleId <= args.before) {
        return false;
      }
      return true;
    });

    const requestedPage = args.page ?? 1;
    const offset = args.after || args.before ? 0 : (requestedPage - 1) * args.limit;
    const pageDocuments = filtered.slice(offset, offset + args.limit);
    const data: HotUpdaterBundle[] = [];
    for (const document of pageDocuments) {
      data.push(await hydrateBundle(ctx, document));
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / args.limit));
    return {
      data,
      pagination: {
        total,
        hasNextPage: offset + pageDocuments.length < total,
        hasPreviousPage: offset > 0 || args.after !== undefined,
        currentPage: requestedPage,
        totalPages,
        nextCursor: pageDocuments.length > 0 ? (pageDocuments.at(-1)?.bundleId ?? null) : null,
        previousCursor: pageDocuments.at(0)?.bundleId ?? null,
      },
    };
  },
});
