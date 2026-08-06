import { ExternalLink as ExternalLinkIcon } from 'lucide-react-native';
import { Platform, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { Image } from '@/components/ui/image';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabTwoScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
  });

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      contentInset={insets}
      contentContainerClassName="flex-row justify-center"
      contentContainerStyle={contentPlatformStyle}
    >
      <ThemedView className="grow max-w-[800px]">
        <ThemedView className="items-center gap-4 px-6 py-16">
          <ThemedText type="subtitle">Explore</ThemedText>
          <ThemedText className="text-center" themeColor="textSecondary">
            This starter app includes example{`\n`}code to help you get started.
          </ThemedText>

          <ExternalLink href="https://docs.expo.dev" asChild>
            <Pressable className="active:opacity-70">
              <ThemedView
                className="flex-row items-center justify-center gap-1 rounded-[32px] px-6 py-2"
                type="backgroundElement"
              >
                <ThemedText type="link">Expo documentation</ThemedText>
                <ExternalLinkIcon color={theme.text} size={12} />
              </ThemedView>
            </Pressable>
          </ExternalLink>
        </ThemedView>

        <ThemedView className="gap-8 px-6 pt-4">
          <Collapsible title="File-based routing">
            <ThemedText type="small">
              The protected tabs live in <ThemedText type="code">src/app/(tabs)</ThemedText>.
            </ThemedText>
            <ThemedText type="small">
              The root <ThemedText type="code">src/app/_layout.tsx</ThemedText> guards them with the
              authenticated Better Auth session.
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/router/advanced/protected/">
              <ThemedText type="linkPrimary">Learn more</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Android and iOS support">
            <ThemedText type="small">
              You can run this project on Android and iOS devices and simulators.
            </ThemedText>
          </Collapsible>

          <Collapsible title="Images">
            <ThemedText type="small">
              Static images can use <ThemedText type="code">@2x</ThemedText> and{' '}
              <ThemedText type="code">@3x</ThemedText> suffixes for different screen densities.
            </ThemedText>
            <Image
              className="size-[100px] self-center"
              source={require('@/assets/images/flavoneer-detail.png')}
            />
          </Collapsible>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}
