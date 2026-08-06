import { ChevronRight } from 'lucide-react-native';
import { type PropsWithChildren, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  return (
    <ThemedView>
      <Pressable
        className="flex-row items-center gap-2 active:opacity-70"
        onPress={() => setIsOpen((value) => !value)}
      >
        <ThemedView
          className="size-6 items-center justify-center rounded-xl"
          type="backgroundElement"
        >
          <ChevronRight
            color={theme.text}
            size={14}
            strokeWidth={3}
            style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}
          />
        </ThemedView>

        <ThemedText type="small">{title}</ThemedText>
      </Pressable>
      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <ThemedView className="ml-6 mt-4 rounded-2xl p-6" type="backgroundElement">
            {children}
          </ThemedView>
        </Animated.View>
      )}
    </ThemedView>
  );
}
