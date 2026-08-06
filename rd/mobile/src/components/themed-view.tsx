import { View, type ViewProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

const colorClassNames: Record<ThemeColor, string> = {
  text: 'bg-black dark:bg-white',
  background: 'bg-white dark:bg-black',
  backgroundElement: 'bg-[#F0F0F3] dark:bg-[#212225]',
  backgroundSelected: 'bg-[#E0E1E6] dark:bg-[#2E3135]',
  textSecondary: 'bg-[#60646C] dark:bg-[#B0B4BA]',
};

export function ThemedView({
  className,
  style,
  lightColor,
  darkColor,
  type,
  ...otherProps
}: ThemedViewProps) {
  return (
    <View
      className={`${colorClassNames[type ?? 'background']} ${className ?? ''}`}
      style={style}
      {...otherProps}
    />
  );
}
