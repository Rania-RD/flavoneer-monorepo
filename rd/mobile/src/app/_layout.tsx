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
import { LocaleDirContext } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BrandColors } from '@/constants/theme';
import { LanguageProvider, useLanguage } from '@/contexts/language-context';
import { OrganizationProvider } from '@/contexts/organization-context';
import { ThemePreferenceProvider, useThemePreference } from '@/contexts/theme-preference-context';
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

function LocalizedNavigator({
  fontsReady,
  hasSession,
  isDark,
  isPending,
}: {
  fontsReady: boolean;
  hasSession: boolean;
  isDark: boolean;
  isPending: boolean;
}) {
  const { language } = useLanguage();
  const direction = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <ThemeProvider value={isDark ? darkNavigationTheme : lightNavigationTheme}>
      <LocaleDirContext.Provider value={direction}>
        <View className="flex-1" style={{ direction }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={hasSession}>
              <Stack.Screen name="(app)" />
              <Stack.Screen name="quality/production-line/[recordId]" />
              <Stack.Screen name="user-settings" />
            </Stack.Protected>

            <Stack.Protected guard={!hasSession}>
              <Stack.Screen name="sign-in" />
            </Stack.Protected>
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <AnimatedSplashOverlay ready={!isPending && fontsReady} />
        </View>
      </LocaleDirContext.Provider>
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { resolvedTheme } = useThemePreference();
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
  const isDark = resolvedTheme === 'dark';

  return (
    <LanguageProvider key={session?.user.email ?? 'signed-out'}>
      <OrganizationProvider enabled={Boolean(session)} key={session?.user.email ?? 'signed-out'}>
        <LocalizedNavigator
          fontsReady={fontsLoaded || Boolean(fontError)}
          hasSession={Boolean(session)}
          isDark={isDark}
          isPending={isPending}
        />
      </OrganizationProvider>
    </LanguageProvider>
  );
}

const HotUpdatedAppNavigator = withHotUpdater(AppNavigator);

function ThemePreferenceBoundary({ children }: PropsWithChildren) {
  const { data: session } = authClient.useSession();
  return (
    <ThemePreferenceProvider key={session?.user.email ?? 'signed-out'}>
      {children}
    </ThemePreferenceProvider>
  );
}

function RootLayout() {
  return (
    <ConvexBetterAuthProvider authClient={authClient} client={convex}>
      <ThemePreferenceBoundary>
        <HotUpdatedAppNavigator />
      </ThemePreferenceBoundary>
    </ConvexBetterAuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
