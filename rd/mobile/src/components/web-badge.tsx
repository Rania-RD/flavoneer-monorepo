import { Image } from 'expo-image';
import { useColorScheme, StyleSheet } from 'react-native';

import { ThemedView } from './themed-view';

export function WebBadge() {
  const scheme = useColorScheme();

  return (
    <ThemedView style={styles.container}>
      <Image
        source={
          scheme === 'dark'
            ? require('@/assets/images/flavoneer-badge-white.png')
            : require('@/assets/images/flavoneer-badge.png')
        }
        style={styles.badgeImage}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
  },
  badgeImage: {
    width: 123,
    aspectRatio: 123 / 24,
  },
});
