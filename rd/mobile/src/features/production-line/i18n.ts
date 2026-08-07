import { useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/language-context';
import ar from '@/locales/ar.json';
import en from '@/locales/en.json';

export type ProductionLineLanguage = 'ar' | 'en';
export type ProductionLineTranslationKey = keyof typeof en;

const translations = { ar, en } as const;

export function useProductionLineI18n() {
  const { language, setLanguage } = useLanguage();
  const t = useCallback(
    (key: ProductionLineTranslationKey, values?: Record<string, number | string>) => {
      let value: string = translations[language][key];
      for (const [name, replacement] of Object.entries(values ?? {})) {
        value = value.replaceAll(`{${name}}`, String(replacement));
      }
      return value;
    },
    [language],
  );

  return useMemo(
    () => ({
      isRTL: language === 'ar',
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );
}
