import { View, type ViewProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

const colorClassNames: Record<ThemeColor, string> = {
  text: 'bg-[#173E33] dark:bg-[#F7F4DF]',
  background: 'bg-[#EEF8EB] dark:bg-[#0D2B24]',
  backgroundElement: 'bg-[#FFFDF4] dark:bg-[#173E33]',
  backgroundSelected: 'bg-[#D2F2D4] dark:bg-[#285B4D]',
  textSecondary: 'bg-[#527568] dark:bg-[#A9CBBB]',
};

export function ThemedView({ className, style, type, ...otherProps }: ThemedViewProps) {
  return (
    <View
      className={`${colorClassNames[type ?? 'background']} ${className ?? ''}`}
      style={style}
      {...otherProps}
    />
  );
}
