import '@/global.css';
import '@/lib/bugsink';

import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import * as Sentry from '@sentry/react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { authClient, convex } from '@/lib/backend';
import { withHotUpdater } from '@/lib/hot-updater';

SplashScreen.preventAutoHideAsync();

function AppNavigator() {
  const colorScheme = useColorScheme();
  const { data: session, isPending } = authClient.useSession();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>

        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
      <AnimatedSplashOverlay ready={!isPending} />
    </ThemeProvider>
  );
}

const HotUpdatedAppNavigator = withHotUpdater(AppNavigator);

function RootLayout() {
  return (
    <ConvexBetterAuthProvider authClient={authClient} client={convex}>
      <HotUpdatedAppNavigator />
    </ConvexBetterAuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
