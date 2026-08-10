import migrations from "@convex-dev/migrations/convex.config.js";
import { defineApp } from "convex/server";
import { v } from "convex/values";
import betterAuth from "./betterAuth/convex.config.js";

const app = defineApp({
  env: {
    BETTER_AUTH_URL: v.optional(v.string()),
    CONVEX_SITE_URL: v.optional(v.string()),
    HOT_UPDATER_API_TOKEN: v.string(),
    HOT_UPDATER_S3_ACCESS_KEY_ID: v.string(),
    HOT_UPDATER_S3_BASE_PATH: v.string(),
    HOT_UPDATER_S3_BUCKET: v.string(),
    HOT_UPDATER_S3_ENDPOINT: v.string(),
    HOT_UPDATER_S3_REGION: v.string(),
    HOT_UPDATER_S3_SECRET_ACCESS_KEY: v.string(),
    INVITATION_EMAIL_WEBHOOK_SECRET: v.optional(v.string()),
    INVITATION_EMAIL_WEBHOOK_URL: v.optional(v.string()),
    MOBILE_SITE_URL: v.optional(v.string()),
    REGULATORY_IMPORT_TOKEN: v.optional(v.string()),
    SITE_URL: v.optional(v.string()),
  },
});
app.use(betterAuth);
app.use(migrations);
export default app;
