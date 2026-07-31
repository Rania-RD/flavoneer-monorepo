interface PublicRuntimeConfig {
  VITE_CONVEX_SITE_URL?: string;
  VITE_CONVEX_URL?: string;
  VITE_PUBLIC_POSTHOG_HOST?: string;
  VITE_PUBLIC_POSTHOG_KEY?: string;
  VITE_SITE_URL?: string;
}

declare global {
  interface Window {
    __FLAVONEER_RUNTIME_CONFIG__?: PublicRuntimeConfig;
  }
}

const runtimeConfig =
  typeof window === "undefined"
    ? undefined
    : window.__FLAVONEER_RUNTIME_CONFIG__;

const readValue = (
  runtimeValue: string | undefined,
  buildTimeValue: string | undefined
): string | undefined => {
  const value = runtimeValue?.trim() || buildTimeValue?.trim();
  return value || undefined;
};

export const publicConfig = {
  convexSiteUrl: readValue(
    runtimeConfig?.VITE_CONVEX_SITE_URL,
    import.meta.env.VITE_CONVEX_SITE_URL
  ),
  convexUrl: readValue(
    runtimeConfig?.VITE_CONVEX_URL,
    import.meta.env.VITE_CONVEX_URL
  ),
  posthogHost: readValue(
    runtimeConfig?.VITE_PUBLIC_POSTHOG_HOST,
    import.meta.env.VITE_PUBLIC_POSTHOG_HOST
  ),
  posthogKey: readValue(
    runtimeConfig?.VITE_PUBLIC_POSTHOG_KEY,
    import.meta.env.VITE_PUBLIC_POSTHOG_KEY
  ),
  siteUrl: readValue(
    runtimeConfig?.VITE_SITE_URL,
    import.meta.env.VITE_SITE_URL
  ),
} as const;
