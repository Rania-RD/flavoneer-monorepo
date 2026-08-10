import { httpRouter } from "convex/server";
import { authComponent, backendAuthEnv, createAuth } from "./auth";
import { handleHotUpdater } from "./hotUpdaterHttp";

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
  cors: true,
  trustedOrigins: [
    backendAuthEnv.siteUrl,
    backendAuthEnv.mobileSiteUrl,
    "flavoneer://",
    "http://localhost:3000",
    "http://localhost:3001",
  ],
});

for (const method of ["GET", "POST", "PATCH", "DELETE"] as const) {
  http.route({
    pathPrefix: "/hot-updater/",
    method,
    handler: handleHotUpdater,
  });
}

export default http;
