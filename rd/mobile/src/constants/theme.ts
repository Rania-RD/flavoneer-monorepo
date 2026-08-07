import { Platform } from 'react-native';

export const BrandColors = {
  forest: '#1C4A3C',
  deepForest: '#102F27',
  ink: '#173E33',
  mint: '#D2F2D4',
  mintSoft: '#EEF8EB',
  cream: '#FFFDF4',
  amber: '#F5A623',
  amberLight: '#FFC760',
  orange: '#FF7738',
  copy: '#527568',
  darkCanvas: '#0D2B24',
  darkSurface: '#173E33',
  darkCopy: '#A9CBBB',
} as const;

export const Colors = {
  light: {
    text: BrandColors.ink,
    background: BrandColors.mintSoft,
    backgroundElement: BrandColors.cream,
    backgroundSelected: BrandColors.mint,
    textSecondary: BrandColors.copy,
    border: 'rgba(28, 74, 60, 0.14)',
    primary: BrandColors.forest,
    primaryText: BrandColors.cream,
    accent: BrandColors.amber,
  },
  dark: {
    text: '#F7F4DF',
    background: BrandColors.darkCanvas,
    backgroundElement: BrandColors.darkSurface,
    backgroundSelected: '#285B4D',
    textSecondary: BrandColors.darkCopy,
    border: 'rgba(210, 242, 212, 0.14)',
    primary: BrandColors.amber,
    primaryText: BrandColors.ink,
    accent: BrandColors.orange,
  },
} as const;

export type ThemeColor =
  | 'text'
  | 'background'
  | 'backgroundElement'
  | 'backgroundSelected'
  | 'textSecondary';

export const Fonts = {
  sans: 'DMSans_500Medium',
  sansRegular: 'DMSans_400Regular',
  sansSemibold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  sansExtraBold: 'DMSans_800ExtraBold',
  display: 'Fraunces_800ExtraBold',
  displayBold: 'Fraunces_900Black',
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
