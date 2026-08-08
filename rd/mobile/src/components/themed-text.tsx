import { Platform, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';

type TextType =
  | 'default'
  | 'title'
  | 'display'
  | 'section'
  | 'small'
  | 'smallBold'
  | 'overline'
  | 'caption'
  | 'subtitle'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
};

const typeClassNames: Record<TextType, string> = {
  small: 'text-sm leading-5',
  smallBold: 'text-sm leading-5',
  default: 'text-base leading-6',
  title: 'text-[38px] leading-[43px]',
  display: 'text-[34px] leading-[39px]',
  section: 'text-[22px] leading-7',
  subtitle: 'text-[30px] leading-[38px]',
  overline: 'text-[11px] leading-4 uppercase tracking-[2px]',
  caption: 'text-xs leading-[18px]',
  link: 'text-sm leading-[22px]',
  linkPrimary: 'text-sm leading-[22px]',
  code: 'text-xs leading-[18px]',
};

const typeStyles: Record<TextType, TextStyle> = {
  small: { fontFamily: Fonts.sans },
  smallBold: { fontFamily: Fonts.sansBold },
  default: { fontFamily: Fonts.sans },
  title: { fontFamily: Fonts.displayBold, letterSpacing: -1.25 },
  display: { fontFamily: Fonts.display, letterSpacing: -0.8 },
  section: { fontFamily: Fonts.display },
  subtitle: { fontFamily: Fonts.display },
  overline: { fontFamily: Fonts.sansExtraBold },
  caption: { fontFamily: Fonts.sans },
  link: { fontFamily: Fonts.sansBold },
  linkPrimary: { fontFamily: Fonts.sansBold },
  code: { fontFamily: Fonts.mono },
};

const arabicFontFamily = Platform.select({ android: 'sans-serif', ios: 'System' });

const arabicTypeStyles: Record<TextType, TextStyle> = {
  small: { fontFamily: arabicFontFamily, fontWeight: '400', letterSpacing: 0 },
  smallBold: { fontFamily: arabicFontFamily, fontWeight: '700', letterSpacing: 0 },
  default: { fontFamily: arabicFontFamily, fontWeight: '400', letterSpacing: 0 },
  title: {
    fontFamily: arabicFontFamily,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 52,
  },
  display: {
    fontFamily: arabicFontFamily,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 47,
  },
  section: {
    fontFamily: arabicFontFamily,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 33,
  },
  subtitle: {
    fontFamily: arabicFontFamily,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 43,
  },
  overline: {
    fontFamily: arabicFontFamily,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'none',
  },
  caption: { fontFamily: arabicFontFamily, fontWeight: '400', letterSpacing: 0 },
  link: { fontFamily: arabicFontFamily, fontWeight: '700', letterSpacing: 0 },
  linkPrimary: { fontFamily: arabicFontFamily, fontWeight: '700', letterSpacing: 0 },
  code: { fontFamily: Fonts.mono, letterSpacing: 0 },
};

const colorClassNames: Record<ThemeColor, string> = {
  text: 'text-[#173E33] dark:text-[#F7F4DF]',
  background: 'text-[#EEF8EB] dark:text-[#0D2B24]',
  backgroundElement: 'text-[#FFFDF4] dark:text-[#173E33]',
  backgroundSelected: 'text-[#D2F2D4] dark:text-[#285B4D]',
  textSecondary: 'text-[#527568] dark:text-[#A9CBBB]',
};

export function ThemedText({
  className,
  style,
  type = 'default',
  themeColor,
  ...rest
}: ThemedTextProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const colorClassName = type === 'linkPrimary' ? '' : colorClassNames[themeColor ?? 'text'];
  const hasExplicitAlignment = className
    ?.split(/\s+/u)
    .some((name) => ['text-center', 'text-left', 'text-right', 'text-justify'].includes(name));
  const localeStyle: TextStyle = {
    textAlign: hasExplicitAlignment ? undefined : 'left',
    writingDirection: 'auto',
  };

  return (
    <Text
      className={`${colorClassName} ${typeClassNames[type]} ${className ?? ''}`}
      style={[typeStyles[type], isRTL ? arabicTypeStyles[type] : undefined, localeStyle, style]}
      {...rest}
    />
  );
}
