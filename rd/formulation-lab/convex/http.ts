import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
  cors: true,
  trustedOrigins: [
    process.env.SITE_URL,
    "http://localhost:3000",
    "http://localhost:3001",
  ],
});

export default http;
