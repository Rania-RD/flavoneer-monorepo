import { HotUpdater } from '@hot-updater/react-native';
import type { ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const hotUpdaterBaseUrl = process.env.EXPO_PUBLIC_HOT_UPDATER_URL;

export function withHotUpdater(Component: ComponentType) {
  if (!hotUpdaterBaseUrl) {
    return Component;
  }

  return HotUpdater.wrap({
    baseURL: hotUpdaterBaseUrl,
    updateStrategy: 'appVersion',
    updateMode: 'auto',
    fallbackComponent: ({ progress, status }) => (
      <View style={styles.updateContainer}>
        <ActivityIndicator color="#208AEF" size="large" />
        <Text style={styles.updateStatus}>
          {status === 'UPDATING' ? 'Updating app…' : 'Checking for updates…'}
        </Text>
        {progress > 0 ? (
          <Text style={styles.updateProgress}>{Math.round(progress * 100)}%</Text>
        ) : null}
      </View>
    ),
  })(Component);
}

const styles = StyleSheet.create({
  updateContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
  },
  updateProgress: {
    color: '#4B5563',
    fontSize: 14,
    marginTop: 8,
  },
  updateStatus: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
});
