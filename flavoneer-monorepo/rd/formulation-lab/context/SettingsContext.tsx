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
import { api } from "../convex/_generated/api";
import { authClient } from "../lib/auth-client";
import { authHelpers } from "../lib/auth-helpers";

type UnitSystem = "metric" | "imperial";
export type Language = "en" | "ar";
export type SignatureType = "upload" | "text";

const SUPPORTED_LANGUAGES = new Set<Language>(["en", "ar"]);
const RTL_LANGUAGES = new Set<Language>(["ar"]);
const SUPPORTED_SIGNATURE_TYPES = new Set<SignatureType>(["upload", "text"]);
type SettingsUpsertArgs = FunctionArgs<typeof api.settings.upsert>;
type PersistableSettingsUpdate = Partial<
  SettingsUpsertArgs & { profile: UserProfile }
>;

const normalizeLanguage = (value: unknown): Language => {
  return typeof value === "string" && SUPPORTED_LANGUAGES.has(value as Language)
    ? (value as Language)
    : "en";
};

const getIsRTLForLanguage = (lang: Language) => RTL_LANGUAGES.has(lang);

const normalizeSignatureType = (value: unknown): SignatureType | undefined => {
  const normalizedValue = value === "draw" ? "upload" : value;
  return typeof normalizedValue === "string" &&
    SUPPORTED_SIGNATURE_TYPES.has(normalizedValue as SignatureType)
    ? (normalizedValue as SignatureType)
    : undefined;
};

export interface UserProfile {
  avatarUrl: string;
  email: string;
  name: string;
  signatureData?: string;
  signatureFont?: string;
  signatureType?: SignatureType;
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
  settingsLoading: boolean;
  setUnits: (unit: UnitSystem) => void;

  signOut: () => Promise<void>;
  toggleDarkMode: () => void;
  toggleNotification: (key: "appAlerts" | "emailSummaries") => void;
  // Appearance & Units
  units: UnitSystem;
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
  const savedSettings = useQuery(api.settings.get);
  const upsertSettings = useMutation(api.settings.upsert);

  // Track whether we've hydrated from Convex
  const [hydrated, setHydrated] = useState(false);

  // ─── Local state ───
  const [units, setUnitsLocal] = useState<UnitSystem>("metric");
  const [notificationsState, setNotifications] = useState({
    appAlerts: true,
    emailSummaries: false,
  });

  // Initialize dark mode from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored) {
        return stored === "dark";
      }
      // Default to Light Mode (false) if no preference is stored
      return false;
    }
    return false;
  });

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
      setUnitsLocal((savedSettings.units as UnitSystem) ?? "metric");

      // Sync Convex settings to local state if available, otherwise keep local preference
      const cloudDarkMode = savedSettings.darkMode;
      if (cloudDarkMode !== undefined) {
        setDarkMode(cloudDarkMode);
        localStorage.setItem("theme", cloudDarkMode ? "dark" : "light");
      }

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
        signatureType: normalizeSignatureType(
          savedSettings.signatureType ?? savedSettings.profile?.signatureType
        ),
        signatureData:
          savedSettings.signatureData ?? savedSettings.profile?.signatureData,
        signatureFont:
          savedSettings.signatureFont ?? savedSettings.profile?.signatureFont,
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
      });
    }
  }, [savedSettings, sessionUser, hydrated, upsertSettings]);

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
    (
      updates: PersistableSettingsUpdate
    ) => {
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
        if (finalUpdates.units !== undefined) {
          cleanUpdates.units = finalUpdates.units;
        }
        if (finalUpdates.darkMode !== undefined) {
          cleanUpdates.darkMode = finalUpdates.darkMode;
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
        if (finalUpdates.signatureType !== undefined) {
          cleanUpdates.signatureType = finalUpdates.signatureType;
        }
        if (finalUpdates.signatureData !== undefined) {
          cleanUpdates.signatureData = finalUpdates.signatureData;
        }
        if (finalUpdates.signatureFont !== undefined) {
          cleanUpdates.signatureFont = finalUpdates.signatureFont;
        }

        upsertSettings(cleanUpdates)
          .catch((err) => {
            console.error("[SettingsContext] Failed to persist settings:", err);
          });
      }, 500);
    },
    [upsertSettings]
  );

  // ─── Theme Side Effect ───
  useEffect(() => {
    // This effect runs on mount and whenever darkMode changes
    const root = window.document.documentElement;

    // Explicitly add or remove the class based on state
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
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
  const setUnits = useCallback(
    (unit: UnitSystem) => {
      setUnitsLocal(unit);
      persistToConvex({ units: unit });
    },
    [persistToConvex]
  );

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;

      // Update localStorage immediately
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", next ? "dark" : "light");
      }

      // Sync to cloud in background
      persistToConvex({ darkMode: next });
      return next;
    });
  }, [persistToConvex]);

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
    if (units === "metric") {
      if (kgValue < 1) {
        return `${(kgValue * 1000).toFixed(0)}${isRTL ? " جم" : "g"}`;
      }
      return `${kgValue.toFixed(2)}${isRTL ? " كجم" : "kg"}`;
    }
    const lbs = kgValue * 2.204_62;
    if (lbs < 1) {
      return `${(lbs * 16).toFixed(1)}${isRTL ? " أونصة" : "oz"}`;
    }
    return `${lbs.toFixed(2)}${isRTL ? " باوند" : "lbs"}`;
  };

  const formatTemp = (celsiusValue: number) => {
    if (units === "metric") {
      return `${celsiusValue}°C`;
    }
    const fahrenheit = (celsiusValue * 9) / 5 + 32;
    return `${fahrenheit.toFixed(1)}°F`;
  };

  // Loading state: savedSettings is undefined while the query is in-flight
  const settingsLoading = savedSettings === undefined && !!sessionUser;

  return (
    <SettingsContext.Provider
      value={{
        units,
        setUnits,
        notifications: notificationsState,
        toggleNotification,
        darkMode,
        toggleDarkMode,
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
