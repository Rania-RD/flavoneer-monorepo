import { api } from "@flavoneer/backend/api";
import { useMutation, useQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";
import type React from "react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "../lib/auth-client";
import { authHelpers } from "../lib/auth-helpers";
import {
  normalizeThemePreference,
  resolveDarkMode,
  type ThemePreference,
} from "../lib/theme-preference";

export type Language = "en" | "ar";

const SUPPORTED_LANGUAGES = new Set<Language>(["en", "ar"]);
const RTL_LANGUAGES = new Set<Language>(["ar"]);
type SettingsUpsertArgs = FunctionArgs<typeof api.settings.upsert>;
type PersistableSettingsUpdate = Partial<
  SettingsUpsertArgs & { profile: UserProfile }
>;

const normalizeLanguage = (value: unknown): Language =>
  typeof value === "string" && SUPPORTED_LANGUAGES.has(value as Language)
    ? (value as Language)
    : "en";

const getIsRTLForLanguage = (lang: Language) => RTL_LANGUAGES.has(lang);

export interface UserProfile {
  avatarUrl: string;
  email: string;
  name: string;
  title: string;
}

interface SettingsContextType {
  darkMode: boolean;

  // Helpers
  formatMass: (kgValue: number) => string;
  formatTemp: (celsiusValue: number) => string;
  isRTL: boolean;

  // Language & RTL
  language: Language;
  notifications: {
    appAlerts: boolean;
    emailSummaries: boolean;
  };

  // Profile & Identity
  profile: UserProfile;
  setLanguage: (lang: Language) => void;
  setThemePreference: (preference: ThemePreference) => void;
  settingsLoading: boolean;

  signOut: () => Promise<void>;
  themePreference: ThemePreference;
  toggleNotification: (key: "appAlerts" | "emailSummaries") => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { i18n } = useTranslation();

  // ─── Auth session ───
  const { data: session } = authClient.useSession();
  const sessionUser = session?.user;

  // ─── Convex settings (per-user) ───
  const savedSettings = useQuery(api.settings.get, sessionUser ? {} : "skip");
  const upsertSettings = useMutation(api.settings.upsert);

  // Track whether we've hydrated from Convex
  const [hydrated, setHydrated] = useState(false);

  // ─── Local state ───
  const [notificationsState, setNotifications] = useState({
    appAlerts: true,
    emailSummaries: false,
  });

  const [themePreference, setThemePreferenceLocal] = useState<ThemePreference>(
    () => {
      if (typeof window !== "undefined") {
        return normalizeThemePreference(localStorage.getItem("theme"));
      }
      return "system";
    }
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const darkMode = resolveDarkMode(themePreference, systemPrefersDark);

  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    title: "",
    email: "",
    avatarUrl: "",
  });
  const [language, setLanguageLocal] = useState<Language>("en");
  const isRTL = getIsRTLForLanguage(language);

  // ─── Hydrate from Convex on first load ───
  useEffect(() => {
    if (savedSettings && !hydrated) {
      const cloudThemePreference = normalizeThemePreference(
        savedSettings.themePreference,
        savedSettings.darkMode
      );
      setThemePreferenceLocal(cloudThemePreference);
      localStorage.setItem("theme", cloudThemePreference);

      setLanguageLocal(normalizeLanguage(savedSettings.language));
      setNotifications({
        appAlerts: savedSettings.appAlerts ?? true,
        emailSummaries: savedSettings.emailSummaries ?? false,
      });

      // Hydrate flattened profile fields (with fallback to legacy profile object)
      setProfile({
        name: savedSettings.name ?? savedSettings.profile?.name ?? "",
        title: savedSettings.title ?? savedSettings.profile?.title ?? "",
        email: savedSettings.email ?? savedSettings.profile?.email ?? "",
        avatarUrl:
          savedSettings.avatarUrl ?? savedSettings.profile?.avatarUrl ?? "",
      });
      setHydrated(true);
    }
    // If no saved settings yet but we have a session user, seed profile from auth
    if (savedSettings === null && sessionUser && !hydrated) {
      const authProfile: UserProfile = {
        name: sessionUser.name ?? "",
        title: "",
        email: sessionUser.email ?? "",
        avatarUrl: sessionUser.image ?? "",
      };
      setProfile(authProfile);
      setHydrated(true);
      // Create the settings row in Convex (flattened)
      upsertSettings({
        ...authProfile,
        themePreference,
      });
    }
  }, [savedSettings, sessionUser, hydrated, themePreference, upsertSettings]);

  // If session user changes (login), and no hydration yet, seed from session
  useEffect(() => {
    if (sessionUser && !hydrated && savedSettings === undefined) {
      // Still loading from Convex — just set profile optimistically from session
      setProfile((prev) => ({
        ...prev,
        name: prev.name || sessionUser.name || "",
        email: prev.email || sessionUser.email || "",
        avatarUrl: prev.avatarUrl || sessionUser.image || "",
      }));
    }
  }, [sessionUser, hydrated, savedSettings]);

  // Debounce ref for persisting settings
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<Partial<SettingsUpsertArgs>>({});

  // ─── Persist helper (debounced) ───
  const persistToConvex = useCallback(
    (updates: PersistableSettingsUpdate) => {
      // Flatten updates if they contain 'profile'
      let flatUpdates: Partial<SettingsUpsertArgs> = { ...updates };
      if (updates.profile) {
        const { profile: _profile, ...updatesWithoutProfile } = updates;
        flatUpdates = { ...updatesWithoutProfile, ...updates.profile };
      }

      // Merge new updates into pending updates
      pendingUpdatesRef.current = {
        ...pendingUpdatesRef.current,
        ...flatUpdates,
      };

      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = setTimeout(() => {
        const finalUpdates = pendingUpdatesRef.current;
        pendingUpdatesRef.current = {}; // Reset pending updates

        const cleanUpdates: Partial<SettingsUpsertArgs> = {};
        if (finalUpdates.darkMode !== undefined) {
          cleanUpdates.darkMode = finalUpdates.darkMode;
        }
        if (finalUpdates.themePreference !== undefined) {
          cleanUpdates.themePreference = finalUpdates.themePreference;
        }
        if (finalUpdates.language !== undefined) {
          cleanUpdates.language = finalUpdates.language;
        }
        if (finalUpdates.appAlerts !== undefined) {
          cleanUpdates.appAlerts = finalUpdates.appAlerts;
        }
        if (finalUpdates.emailSummaries !== undefined) {
          cleanUpdates.emailSummaries = finalUpdates.emailSummaries;
        }
        if (finalUpdates.name !== undefined) {
          cleanUpdates.name = finalUpdates.name;
        }
        if (finalUpdates.title !== undefined) {
          cleanUpdates.title = finalUpdates.title;
        }
        if (finalUpdates.email !== undefined) {
          cleanUpdates.email = finalUpdates.email;
        }
        if (finalUpdates.avatarUrl !== undefined) {
          cleanUpdates.avatarUrl = finalUpdates.avatarUrl;
        }
        upsertSettings(cleanUpdates).catch((err) => {
          console.error("[SettingsContext] Failed to persist settings:", err);
        });
      }, 500);
    },
    [upsertSettings]
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemPreference = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", syncSystemPreference);
    return () => mediaQuery.removeEventListener("change", syncSystemPreference);
  }, []);

  // ─── Theme Side Effect ───
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.dataset.agThemeMode = darkMode ? "dark" : "light";
  }, [darkMode]);

  // ─── Language/RTL Side Effect ───
  useEffect(() => {
    const direction = getIsRTLForLanguage(language) ? "rtl" : "ltr";

    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.body.dir = direction;

    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // ─── Setters that also persist ───
  const setThemePreference = useCallback(
    (preference: ThemePreference) => {
      setThemePreferenceLocal(preference);
      localStorage.setItem("theme", preference);
      const currentSystemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      persistToConvex({
        darkMode: resolveDarkMode(preference, currentSystemPrefersDark),
        themePreference: preference,
      });
    },
    [persistToConvex]
  );

  const toggleNotification = useCallback(
    (key: "appAlerts" | "emailSummaries") => {
      setNotifications((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        persistToConvex({ [key]: next[key] });
        return next;
      });
    },
    [persistToConvex]
  );

  const setLanguage = useCallback(
    (lang: Language) => {
      const nextLanguage = normalizeLanguage(lang);
      setLanguageLocal(nextLanguage);
      persistToConvex({ language: nextLanguage });
    },
    [persistToConvex]
  );

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      setProfile((prev) => {
        const next = { ...prev, ...updates };
        persistToConvex({ profile: next });
        return next;
      });
    },
    [persistToConvex]
  );

  // ─── Sign out ───
  const signOut = useCallback(async () => {
    await authHelpers.signOut();
  }, []);

  // ─── Unit formatters ───
  const formatMass = (kgValue: number) => {
    if (kgValue < 1) {
      return `${(kgValue * 1000).toFixed(0)}${isRTL ? " جم" : "g"}`;
    }
    return `${kgValue.toFixed(2)}${isRTL ? " كجم" : "kg"}`;
  };

  const formatTemp = (celsiusValue: number) => `${celsiusValue}°C`;

  // Loading state: savedSettings is undefined while the query is in-flight
  const settingsLoading = savedSettings === undefined && !!sessionUser;

  return (
    <SettingsContext.Provider
      value={{
        notifications: notificationsState,
        toggleNotification,
        darkMode,
        themePreference,
        setThemePreference,
        profile,
        updateProfile,
        language,
        setLanguage,
        isRTL,
        formatMass,
        formatTemp,
        signOut,
        settingsLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
