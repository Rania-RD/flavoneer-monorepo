import { useMutation, useQuery } from 'convex/react';
import { colorScheme as nativeColorScheme, useColorScheme } from 'nativewind';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api } from '@/lib/backend';

export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

type ThemePreferenceContextValue = {
  resolvedTheme: ResolvedTheme;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  themePreference: ThemePreference;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

function normalizeThemePreference(value: unknown, legacyDarkMode?: boolean): ThemePreference {
  if (value === 'dark' || value === 'light' || value === 'system') {
    return value;
  }
  if (legacyDarkMode !== undefined) {
    return legacyDarkMode ? 'dark' : 'light';
  }
  return 'system';
}

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const savedSettings = useQuery(api.settings.get);
  const upsertSettings = useMutation(api.settings.upsert);
  const { colorScheme } = useColorScheme();
  const [selectedPreference, setSelectedPreference] = useState<ThemePreference | null>(null);
  const savedPreference = normalizeThemePreference(
    savedSettings?.themePreference,
    savedSettings?.darkMode,
  );
  const themePreference = selectedPreference ?? savedPreference;
  const resolvedTheme: ResolvedTheme = colorScheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    nativeColorScheme.set(themePreference);
  }, [themePreference]);

  const setThemePreference = useCallback(
    async (nextPreference: ThemePreference) => {
      if (nextPreference === themePreference) {
        return;
      }
      setSelectedPreference(nextPreference);
      nativeColorScheme.set(nextPreference);
      try {
        await upsertSettings({
          darkMode:
            nextPreference === 'system' ? colorScheme === 'dark' : nextPreference === 'dark',
          themePreference: nextPreference,
        });
      } catch (error) {
        setSelectedPreference(null);
        throw error;
      }
    },
    [colorScheme, themePreference, upsertSettings],
  );

  const value = useMemo(
    () => ({ resolvedTheme, setThemePreference, themePreference }),
    [resolvedTheme, setThemePreference, themePreference],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  }
  return context;
}
