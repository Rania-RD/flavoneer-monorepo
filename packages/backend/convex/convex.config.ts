import migrations from "@convex-dev/migrations/convex.config.js";
import { defineApp } from "convex/server";
import betterAuth from "./betterAuth/convex.config.js";

const app = defineApp();
app.use(betterAuth);
app.use(migrations);
export default app;
