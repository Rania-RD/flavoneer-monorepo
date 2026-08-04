import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * Generate a short-lived upload URL for Convex file storage.
 * The client POSTs the file to this URL and receives a storageId.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Return the public URL for a given storageId.
 * NOTE: This is a mutation (not a query) because the frontend calls it
 * imperatively right after uploading a file via useMutation(). A query
 * would require useQuery() which doesn't support imperative one-shot calls.
 */
export const getFileUrl = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
