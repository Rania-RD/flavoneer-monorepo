import { HotUpdater } from '@hot-updater/react-native';
import type { ComponentType } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { mobileEnv } from './env';

export function withHotUpdater(Component: ComponentType) {
  if (!mobileEnv.hotUpdaterUrl) {
    return Component;
  }

  return HotUpdater.wrap({
    baseURL: mobileEnv.hotUpdaterUrl,
    updateStrategy: 'appVersion',
    updateMode: 'auto',
    fallbackComponent: ({ progress, status }) => (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#208AEF" size="large" />
        <Text className="mt-5 text-lg font-semibold text-[#111827]">
          {status === 'UPDATING' ? 'Updating app…' : 'Checking for updates…'}
        </Text>
        {progress > 0 ? (
          <Text className="mt-2 text-sm text-[#4B5563]">{Math.round(progress * 100)}%</Text>
        ) : null}
      </View>
    ),
  })(Component);
}
