import { Text, type TextProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';

type TextType =
  | 'default'
  | 'title'
  | 'small'
  | 'smallBold'
  | 'subtitle'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
};

const typeClassNames: Record<TextType, string> = {
  small: 'text-sm font-medium leading-5',
  smallBold: 'text-sm font-bold leading-5',
  default: 'text-base font-medium leading-6',
  title: 'text-5xl font-semibold leading-[52px]',
  subtitle: 'text-[32px] font-semibold leading-[44px]',
  link: 'text-sm leading-[30px]',
  linkPrimary: 'text-sm leading-[30px] text-[#3c87f7]',
  code: 'font-[monospace] text-xs font-medium ios:font-[ui-monospace] android:font-bold',
};

const colorClassNames: Record<ThemeColor, string> = {
  text: 'text-black dark:text-white',
  background: 'text-white dark:text-black',
  backgroundElement: 'text-[#F0F0F3] dark:text-[#212225]',
  backgroundSelected: 'text-[#E0E1E6] dark:text-[#2E3135]',
  textSecondary: 'text-[#60646C] dark:text-[#B0B4BA]',
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
      style={style}
      {...rest}
    />
  );
}
