import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins';
import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { ConvexReactClient } from 'convex/react';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexSiteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

if (!convexUrl) {
  throw new Error('EXPO_PUBLIC_CONVEX_URL is required.');
}

if (!convexSiteUrl) {
  throw new Error('EXPO_PUBLIC_CONVEX_SITE_URL is required.');
}

export { api } from '@flavoneer/backend/api';

export const convex = new ConvexReactClient(convexUrl);

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [
    organizationClient(),
    convexClient(),
    crossDomainClient() as unknown as ReturnType<typeof convexClient>,
  ],
});
