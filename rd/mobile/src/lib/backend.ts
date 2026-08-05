import { expoClient } from '@better-auth/expo/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { ConvexReactClient } from 'convex/react';
import * as SecureStore from 'expo-secure-store';
import { mobileEnv } from './env';

export { api } from '@flavoneer/backend/api';

export const convex = new ConvexReactClient(mobileEnv.convexUrl, {
  unsavedChangesWarning: false,
});

export const authClient = createAuthClient({
  baseURL: mobileEnv.convexSiteUrl,
  plugins: [
    expoClient({
      scheme: 'flavoneer',
      storagePrefix: 'flavoneer',
      storage: SecureStore,
    }),
    organizationClient(),
    convexClient(),
  ],
});
