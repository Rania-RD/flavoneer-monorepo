import '@/global.css';
import '@/lib/bugsink';

import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans/800ExtraBold';
import { Fraunces_800ExtraBold } from '@expo-google-fonts/fraunces/800ExtraBold';
import { Fraunces_900Black } from '@expo-google-fonts/fraunces/900Black';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BrandColors } from '@/constants/theme';
import { authClient, convex } from '@/lib/backend';
import { withHotUpdater } from '@/lib/hot-updater';

SplashScreen.preventAutoHideAsync();

const lightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: BrandColors.forest,
    background: BrandColors.mintSoft,
    card: BrandColors.cream,
    text: BrandColors.ink,
    border: 'rgba(28, 74, 60, 0.14)',
  },
};

const darkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: BrandColors.amber,
    background: BrandColors.darkCanvas,
    card: BrandColors.darkSurface,
    text: '#F7F4DF',
    border: 'rgba(210, 242, 212, 0.14)',
  },
};

function AppNavigator() {
  const colorScheme = useColorScheme();
  const { data: session, isPending } = authClient.useSession();
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    Fraunces_800ExtraBold,
    Fraunces_900Black,
  });
  const isDark = colorScheme === 'dark';

  return (
    <ThemeProvider value={isDark ? darkNavigationTheme : lightNavigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>

        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AnimatedSplashOverlay ready={!isPending && (fontsLoaded || Boolean(fontError))} />
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
