import { expoClient } from '@better-auth/expo/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { ConvexReactClient } from 'convex/react';
import * as SecureStore from 'expo-secure-store';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexSiteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

if (!convexUrl) {
  throw new Error('EXPO_PUBLIC_CONVEX_URL is required.');
}

if (!convexSiteUrl) {
  throw new Error('EXPO_PUBLIC_CONVEX_SITE_URL is required.');
}

export { api } from '@flavoneer/backend/api';

export const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [
    expoClient({
      scheme: 'mobile',
      storagePrefix: 'flavoneer',
      storage: SecureStore,
    }),
    organizationClient(),
    convexClient(),
  ],
});
