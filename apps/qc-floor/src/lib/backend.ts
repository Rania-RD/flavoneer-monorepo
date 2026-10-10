import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL;

if (!convexUrl || !convexSiteUrl) {
  throw new Error(
    "VITE_CONVEX_URL and VITE_CONVEX_SITE_URL are required to load production QC data.",
  );
}

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  sessionOptions: {
    refetchOnWindowFocus: false,
  },
  plugins: [
    organizationClient(),
    convexClient(),
    crossDomainClient() as unknown as ReturnType<typeof convexClient>,
  ],
});
