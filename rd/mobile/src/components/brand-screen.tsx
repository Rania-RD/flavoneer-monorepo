import { cssInterop } from 'nativewind';
import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkspaceSectionSwitcher } from '@/components/workspace-section-switcher';
import { useProductionLineI18n } from '@/features/production-line/i18n';
import { useTheme } from '@/hooks/use-theme';

const AnimatedView = cssInterop(Animated.View, { className: 'style' }) as typeof Animated.View;

export function BrandScreen({ children }: PropsWithChildren) {
  return (
    <ThemedView className="flex-1 overflow-hidden">
      <View
        className="pointer-events-none absolute -start-28 -top-24 size-72 rounded-full bg-[#D2F2D4]/80 dark:bg-[#285B4D]/35"
        style={{ opacity: 0.9 }}
      />
      <View className="pointer-events-none absolute -end-24 top-[28%] size-64 rounded-full bg-[#F5A623]/10 dark:bg-[#F5A623]/5" />
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="mx-auto w-full max-w-[800px] px-5 pt-3"
          contentContainerStyle={{ paddingBottom: 28 }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

export function BrandEntrance({
  children,
  className,
  delay = 0,
}: PropsWithChildren<{ className?: string; delay?: number }>) {
  return (
    <AnimatedView
      className={className}
      entering={FadeInDown.delay(delay).duration(480).springify()}
    >
      {children}
    </AnimatedView>
  );
}

export function BrandHeader({
  action,
  actionPosition = 'end',
  className = 'mb-8',
  secondaryAction,
  subtitle,
}: {
  action?: ReactNode;
  actionPosition?: 'end' | 'start';
  className?: string;
  secondaryAction?: ReactNode;
  subtitle?: ReactNode;
}) {
  const { t } = useProductionLineI18n();
  const brand = (
    <View className="min-w-0 flex-1 flex-row items-center gap-3">
      <WorkspaceSectionSwitcher />
      <View className="min-w-0 flex-1">
        <ThemedText className="leading-6" type="section">
          Flavoneer
        </ThemedText>
        <ThemedText className="mt-0.5" themeColor="textSecondary" type="overline">
          {subtitle ?? t('researchWorkspace')}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <View className={`${className} flex-row items-center justify-between gap-4`}>
      {actionPosition === 'start' ? action : secondaryAction}
      {brand}
      {actionPosition === 'start' ? secondaryAction : action}
    </View>
  );
}

export function BrandSurface({
  children,
  className = '',
}: PropsWithChildren<{ className?: string }>) {
  const theme = useTheme();

  return (
    <ThemedView
      className={`rounded-[32px] border p-6 ${className}`}
      style={{
        borderColor: theme.border,
        elevation: 2,
        shadowColor: '#102F27',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.07,
        shadowRadius: 24,
      }}
      type="backgroundElement"
    >
      {children}
    </ThemedView>
  );
}

export function StatusPill({ children }: PropsWithChildren) {
  return (
    <View className="flex-row items-center gap-2 self-start rounded-full border border-[#1C4A3C]/10 bg-[#D2F2D4]/60 px-3.5 py-2 dark:border-[#D2F2D4]/10 dark:bg-[#D2F2D4]/10">
      <View className="size-2 rounded-full bg-[#FF7738]" />
      <ThemedText className="text-[12px] leading-4" type="smallBold">
        {children}
      </ThemedText>
    </View>
  );
}
