import { useMutation, useQuery } from 'convex/react';
import { getLocales } from 'expo-localization';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { api } from '@/lib/backend';

export type AppLanguage = 'ar' | 'en';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getDeviceLanguage(): AppLanguage {
  return getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const savedSettings = useQuery(api.settings.get);
  const upsertSettings = useMutation(api.settings.upsert);
  const deviceLanguage = useMemo(() => getDeviceLanguage(), []);
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage | null>(null);
  const language = selectedLanguage ?? savedSettings?.language ?? deviceLanguage;

  const setLanguage = useCallback(
    async (nextLanguage: AppLanguage) => {
      setSelectedLanguage(nextLanguage);
      try {
        await upsertSettings({ language: nextLanguage });
      } catch (error) {
        setSelectedLanguage(null);
        throw error;
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
