import { Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';

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
  const colorClassName = type === 'linkPrimary' ? '' : colorClassNames[themeColor ?? 'text'];

  return (
    <Text
      className={`${colorClassName} ${typeClassNames[type]} ${className ?? ''}`}
      style={[typeStyles[type], style]}
      {...rest}
    />
  );
}
