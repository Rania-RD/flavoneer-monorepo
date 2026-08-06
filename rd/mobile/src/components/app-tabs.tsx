import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.backgroundElement}
      blurEffect={scheme === 'dark' ? 'systemMaterialDark' : 'systemMaterialLight'}
      disableTransparentOnScrollEdge
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      indicatorColor={colors.backgroundSelected}
      labelStyle={{
        default: { color: colors.textSecondary, fontFamily: Fonts.sansBold, fontSize: 11 },
        selected: { color: colors.primary, fontFamily: Fonts.sansBold, fontSize: 11 },
      }}
      rippleColor={colors.backgroundSelected}
      shadowColor={colors.border}
      tintColor={colors.primary}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Workspace</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
