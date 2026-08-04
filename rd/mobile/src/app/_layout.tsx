import '@/global.css';
import '@/lib/bugsink';

import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import * as Sentry from '@sentry/react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { authClient, convex } from '@/lib/backend';
import { withHotUpdater } from '@/lib/hot-updater';

SplashScreen.preventAutoHideAsync();

function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

const HotUpdatedTabLayout = withHotUpdater(TabLayout);

function RootLayout() {
  return (
    <ConvexBetterAuthProvider authClient={authClient} client={convex}>
      <HotUpdatedTabLayout />
    </ConvexBetterAuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
