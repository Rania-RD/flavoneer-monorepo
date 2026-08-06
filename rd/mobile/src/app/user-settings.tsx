import { useRouter } from 'expo-router';
import { ChevronLeft, LogOut } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BrandEntrance, BrandScreen, BrandSurface } from '@/components/brand-screen';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/backend';

export default function UserSettingsScreen() {
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
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
    <BrandScreen>
      <BrandEntrance className="mb-8 flex-row items-center gap-4">
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          className="size-11 items-center justify-center rounded-full border border-[#1C4A3C]/10 bg-[#FFFDF4]/80 active:scale-95 active:opacity-70 dark:border-[#D2F2D4]/10 dark:bg-[#173E33]"
          onPress={() => router.back()}
        >
          <ChevronLeft color={theme.text} size={22} strokeWidth={2.2} />
        </Pressable>
        <View>
          <ThemedText themeColor="textSecondary" type="overline">
            Account
          </ThemedText>
          <ThemedText className="mt-0.5" type="section">
            User settings
          </ThemedText>
        </View>
      </BrandEntrance>

      <BrandEntrance className="mb-7" delay={70}>
        <ThemedText className="max-w-[360px]" type="title">
          Your profile.
        </ThemedText>
        <ThemedText className="mt-3 max-w-[420px]" themeColor="textSecondary" type="small">
          Review the account connected to this device and manage your active session.
        </ThemedText>
      </BrandEntrance>

      <BrandEntrance delay={140}>
        <BrandSurface className="mb-6 !p-0">
          <View className="flex-row items-center gap-4 px-5 py-5">
            <UserAvatar
              name={session?.user.name || session?.user.email}
              seed={session?.user.email}
              size={56}
            />
            <View className="min-w-0 flex-1">
              <ThemedText numberOfLines={1} type="smallBold">
                {session?.user.name || 'Flavoneer member'}
              </ThemedText>
              <ThemedText
                className="mt-0.5"
                numberOfLines={1}
                themeColor="textSecondary"
                type="caption"
              >
                {session?.user.email || 'No email available'}
              </ThemedText>
            </View>
          </View>

          <View className="ms-5 h-px bg-[#1C4A3C]/10 dark:bg-[#D2F2D4]/10" />

          <View className="gap-5 px-5 py-5">
            <SettingValue label="Name" value={session?.user.name || 'Not set'} />
            <SettingValue label="Email" value={session?.user.email || 'Not set'} />
          </View>
        </BrandSurface>
      </BrandEntrance>

      <BrandEntrance delay={210}>
        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          className={`min-h-[54px] flex-row items-center justify-center gap-2 rounded-[18px] border border-[#1C4A3C]/12 bg-[#FFFDF4]/80 active:scale-[0.98] active:opacity-70 dark:border-[#D2F2D4]/10 dark:bg-[#173E33] ${isSigningOut ? 'opacity-50' : ''}`}
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
      </BrandEntrance>
    </BrandScreen>
  );
}

function SettingValue({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <ThemedText themeColor="textSecondary" type="overline">
        {label}
      </ThemedText>
      <ThemedText className="mt-1" type="small">
        {value}
      </ThemedText>
    </View>
  );
}
