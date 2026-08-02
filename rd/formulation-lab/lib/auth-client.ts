import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { publicConfig } from "./runtime-config";

export const authClient = createAuthClient({
  baseURL: publicConfig.convexSiteUrl,
  plugins: [
    organizationClient(),
    convexClient(),
    crossDomainClient() as unknown as ReturnType<typeof convexClient>,
  ],
});
