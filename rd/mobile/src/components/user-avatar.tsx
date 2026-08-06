import { getAvatarIdentity } from '@flavoneer/ui/avatar';
import { type StyleProp, Text, View, type ViewStyle } from 'react-native';

import { Fonts } from '@/constants/theme';

interface UserAvatarProps {
  accessibilityLabel?: string;
  name?: string | null;
  seed?: string | null;
  size: number;
  style?: StyleProp<ViewStyle>;
}

export function UserAvatar({ accessibilityLabel, name, seed, size, style }: UserAvatarProps) {
  const identity = getAvatarIdentity(name, seed);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessible={Boolean(accessibilityLabel)}
      style={[
        {
          alignItems: 'center',
          backgroundColor: identity.backgroundColor,
          borderRadius: size / 2,
          height: size,
          justifyContent: 'center',
          overflow: 'hidden',
          width: size,
        },
        style,
      ]}
    >
      <Text
        allowFontScaling={false}
        style={{
          color: identity.color,
          fontFamily: Fonts.sansExtraBold,
          fontSize: Math.max(10, Math.round(size * 0.34)),
          lineHeight: Math.max(12, Math.round(size * 0.4)),
        }}
      >
        {identity.initials}
      </Text>
    </View>
  );
}
