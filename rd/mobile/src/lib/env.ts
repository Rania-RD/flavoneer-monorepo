import { createMobileEnv } from '@flavoneer/config/env/mobile';

// Expo only inlines direct process.env.EXPO_PUBLIC_* reads in application code.
export const mobileEnv = createMobileEnv({
  EXPO_PUBLIC_CONVEX_SITE_URL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL,
  EXPO_PUBLIC_HOT_UPDATER_URL: process.env.EXPO_PUBLIC_HOT_UPDATER_URL,
});
