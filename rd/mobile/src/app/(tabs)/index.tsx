import * as Device from 'expo-device';
import { LogOut } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/backend';

function getDevMenuHint() {
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const theme = useTheme();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        Alert.alert('Could not sign out', result.error.message ?? 'Try again.');
      }
    } catch (error) {
      Alert.alert('Could not sign out', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <ThemedView className="flex-1 flex-row justify-center">
      <SafeAreaView className="max-w-[800px] flex-1 items-center gap-4 px-6 pb-4 ios:pb-[66px] android:pb-24">
        <ThemedView className="flex-1 items-center justify-center gap-4 px-6">
          <AnimatedIcon />
          <ThemedText className="text-center" type="title">
            Welcome back{session?.user.name ? `, ${session.user.name}` : ''}
          </ThemedText>
          {session?.user.email ? (
            <ThemedText className="text-center" themeColor="textSecondary">
              {session.user.email}
            </ThemedText>
          ) : null}
        </ThemedView>

        <ThemedText className="uppercase" type="code">
          authenticated session
        </ThemedText>

        <ThemedView className="self-stretch gap-4 rounded-3xl px-4 py-6" type="backgroundElement">
          <HintRow
            title="Try editing"
            hint={<ThemedText type="code">src/app/(tabs)/index.tsx</ThemedText>}
          />
          <HintRow title="Dev tools" hint={getDevMenuHint()} />
          <Pressable
            accessibilityRole="button"
            className={`min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border-hairline border-[#E0E1E6] active:opacity-[0.65] dark:border-[#2E3135] ${isSigningOut ? 'opacity-50' : ''}`}
            disabled={isSigningOut}
            onPress={handleSignOut}
          >
            {isSigningOut ? (
              <ActivityIndicator color={theme.text} size="small" />
            ) : (
              <LogOut color={theme.text} size={18} />
            )}
            <ThemedText type="smallBold">Sign out</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}
