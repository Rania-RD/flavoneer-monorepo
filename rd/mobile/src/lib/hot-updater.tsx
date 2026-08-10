import { HotUpdater } from '@hot-updater/react-native';
import { getLocales } from 'expo-localization';
import type { ComponentType } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import ar from '@/locales/ar.json';
import en from '@/locales/en.json';
import { mobileEnv } from './env';

export function withHotUpdater(Component: ComponentType) {
  if (!mobileEnv.hotUpdaterUrl) {
    return Component;
  }

  return HotUpdater.wrap({
    baseURL: mobileEnv.hotUpdaterUrl,
    updateStrategy: 'appVersion',
    updateMode: 'auto',
    fallbackComponent: ({ progress, status }) => {
      const language = getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';
      const copy = language === 'ar' ? ar : en;

      return (
        <View
          className="flex-1 items-center justify-center bg-white"
          style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
        >
          <ActivityIndicator color="#208AEF" size="large" />
          <Text
            className="mt-5 text-lg font-semibold text-[#111827]"
            style={{ writingDirection: language === 'ar' ? 'rtl' : 'ltr' }}
          >
            {status === 'UPDATING' ? copy.updatingApp : copy.checkingUpdates}
          </Text>
          {progress > 0 ? (
            <Text className="mt-2 text-sm text-[#4B5563]">{Math.round(progress * 100)}%</Text>
          ) : null}
        </View>
      );
    },
  })(Component);
}
