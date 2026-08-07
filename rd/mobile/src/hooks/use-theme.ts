/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from 'nativewind';
import { Colors } from '@/constants/theme';

export function useTheme() {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}
