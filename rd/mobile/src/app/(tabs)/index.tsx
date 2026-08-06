import { useRouter } from 'expo-router';
import { ChevronRight, FlaskConical, LogOut, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import {
  BrandEntrance,
  BrandHeader,
  BrandScreen,
  BrandSurface,
  StatusPill,
} from '@/components/brand-screen';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { BrandColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/backend';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const firstName = session?.user.name?.trim().split(/\s+/)[0];

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
      <BrandEntrance>
        <BrandHeader
          action={
            <Pressable
              accessibilityHint="Opens your account and session settings"
              accessibilityLabel="User settings"
              accessibilityRole="button"
              className="size-11 items-center justify-center rounded-full active:scale-95 active:opacity-70"
              onPress={() => router.navigate('/user-settings')}
            >
              <UserAvatar
                name={session?.user.name || session?.user.email}
                seed={session?.user.email}
                size={44}
              />
            </Pressable>
          }
        />
      </BrandEntrance>

      <BrandEntrance className="mb-7" delay={70}>
        <ThemedText themeColor="textSecondary" type="overline">
          Lab overview
        </ThemedText>
        <ThemedText className="mt-2 max-w-[360px]" type="title">
          {getGreeting()}
          {firstName ? `, ${firstName}.` : '.'}
        </ThemedText>
        <View className="mt-4">
          <StatusPill>Workspace online</StatusPill>
        </View>
      </BrandEntrance>

      <BrandEntrance delay={140}>
        <View
          className="relative mb-8 min-h-[280px] overflow-hidden rounded-[40px] bg-[#1C4A3C] p-7 dark:bg-[#102F27]"
          style={{
            elevation: 5,
            shadowColor: BrandColors.deepForest,
            shadowOffset: { width: 0, height: 18 },
            shadowOpacity: 0.2,
            shadowRadius: 28,
          }}
        >
          <View className="absolute -end-20 -top-20 size-56 rounded-full border-[40px] border-[#F5A623]/15" />
          <View className="absolute -bottom-16 -start-12 size-40 rounded-full bg-[#D2F2D4]/5" />

          <View className="mb-auto size-14 items-center justify-center rounded-[19px] bg-[#F5A623]">
            <FlaskConical color={BrandColors.ink} size={27} strokeWidth={2.4} />
          </View>
          <View className="mt-10 max-w-[290px]">
            <ThemedText className="!text-[#B9D8C8]" type="overline">
              Current run
            </ThemedText>
            <ThemedText className="mt-2 !text-[#FFFDF4]" type="display">
              No batch in progress
            </ThemedText>
            <ThemedText className="mt-3 !text-[#D3E7DB]" type="small">
              Start a run in the formulation workspace. Active steps and checks will appear here.
            </ThemedText>
          </View>
        </View>
      </BrandEntrance>

      <BrandEntrance className="mb-3 flex-row items-end justify-between px-1" delay={220}>
        <View>
          <ThemedText themeColor="textSecondary" type="overline">
            Workspace
          </ThemedText>
          <ThemedText className="mt-1" type="section">
            Connected areas
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary" type="caption">
          2 available
        </ThemedText>
      </BrandEntrance>

      <BrandEntrance delay={270}>
        <BrandSurface className="mb-6 !p-0">
          <WorkspaceRow
            detail="Formulations and controlled versions"
            icon={<FlaskConical color={BrandColors.forest} size={21} />}
            title="Research & development"
          />
          <View className="ms-[76px] h-px bg-[#1C4A3C]/10 dark:bg-[#D2F2D4]/10" />
          <WorkspaceRow
            detail="Reports and finished-good records"
            icon={<ShieldCheck color={BrandColors.forest} size={21} />}
            title="Quality control"
          />
        </BrandSurface>
      </BrandEntrance>

      <BrandEntrance delay={320}>
        <BrandSurface className="gap-5">
          <View>
            <ThemedText themeColor="textSecondary" type="overline">
              Signed in as
            </ThemedText>
            <ThemedText className="mt-1" type="smallBold">
              {session?.user.name || 'Flavoneer member'}
            </ThemedText>
            {session?.user.email ? (
              <ThemedText className="mt-0.5" themeColor="textSecondary" type="caption">
                {session.user.email}
              </ThemedText>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            className={`min-h-[52px] flex-row items-center justify-center gap-2 rounded-[18px] border border-[#1C4A3C]/12 bg-[#EEF8EB] active:scale-[0.98] active:opacity-70 dark:border-[#D2F2D4]/10 dark:bg-[#285B4D] ${isSigningOut ? 'opacity-50' : ''}`}
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
        </BrandSurface>
      </BrandEntrance>
    </BrandScreen>
  );
}

function WorkspaceRow({
  detail,
  icon,
  title,
}: {
  detail: string;
  icon: React.ReactNode;
  title: string;
}) {
  const theme = useTheme();

  return (
    <View className="flex-row items-center gap-4 px-5 py-5">
      <View className="size-11 items-center justify-center rounded-[16px] bg-[#D2F2D4]">
        {icon}
      </View>
      <View className="min-w-0 flex-1">
        <ThemedText numberOfLines={1} type="smallBold">
          {title}
        </ThemedText>
        <ThemedText className="mt-0.5" numberOfLines={1} themeColor="textSecondary" type="caption">
          {detail}
        </ThemedText>
      </View>
      <ChevronRight color={theme.textSecondary} size={18} />
    </View>
  );
}
