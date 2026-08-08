import { useMutation, useQuery } from 'convex/react';
import { reloadAppAsync } from 'expo';
import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { I18nManager, Platform } from 'react-native';

import { api } from '@/lib/backend';

export type AppLanguage = 'ar' | 'en';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_STORAGE_KEY = 'flavoneer.language';

export class LanguageReloadError extends Error {
  constructor() {
    super('The language was saved, but the native layout could not be reloaded.');
    this.name = 'LanguageReloadError';
  }
}

function isAppLanguage(value: string | null): value is AppLanguage {
  return value === 'ar' || value === 'en';
}

function getDeviceLanguage(): AppLanguage {
  return getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';
}

async function applyNativeDirection(language: AppLanguage) {
  const shouldBeRTL = language === 'ar';
  const isExpoGo = Boolean(Constants.expoGoConfig);
  if (Platform.OS === 'web' || isExpoGo || shouldBeRTL === I18nManager.isRTL) {
    return;
  }

  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
  await reloadAppAsync('language-direction-changed');
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const savedSettings = useQuery(api.settings.get);
  const upsertSettings = useMutation(api.settings.upsert);
  const deviceLanguage = useMemo(() => getDeviceLanguage(), []);
  const [storedLanguage, setStoredLanguage] = useState<AppLanguage | null | undefined>(undefined);
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage | null>(null);
  const language = selectedLanguage ?? savedSettings?.language ?? storedLanguage ?? deviceLanguage;

  useEffect(() => {
    SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY)
      .then((value) => {
        setStoredLanguage(isAppLanguage(value) ? value : null);
      })
      .catch(() => setStoredLanguage(null));
  }, []);

  useEffect(() => {
    if (!savedSettings?.language) {
      return;
    }
    SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, savedSettings.language).catch(() => undefined);
  }, [savedSettings?.language]);

  useEffect(() => {
    const settingsLoaded = savedSettings !== undefined;
    const storageLoaded = storedLanguage !== undefined;
    if (!(settingsLoaded && storageLoaded) || selectedLanguage !== null) {
      return;
    }
    applyNativeDirection(language).catch((error) => {
      console.error('Could not apply the saved native language direction:', error);
    });
  }, [language, savedSettings, selectedLanguage, storedLanguage]);

  const setLanguage = useCallback(
    async (nextLanguage: AppLanguage) => {
      setSelectedLanguage(nextLanguage);
      try {
        await upsertSettings({ language: nextLanguage });
        setStoredLanguage(nextLanguage);
        await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, nextLanguage).catch(() => undefined);
      } catch (error) {
        setSelectedLanguage(null);
        throw error;
      }

      try {
        await applyNativeDirection(nextLanguage);
      } catch {
        throw new LanguageReloadError();
      }
    },
    [upsertSettings],
  );

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
