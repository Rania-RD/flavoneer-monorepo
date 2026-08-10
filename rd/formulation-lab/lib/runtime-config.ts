import {
  createFormulationLabEnv,
  type FormulationLabEnvSource,
} from "@flavoneer/config/env/formulation-lab";

type PublicRuntimeConfig = Partial<FormulationLabEnvSource>;

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

export const publicConfig = createFormulationLabEnv({
  VITE_CONVEX_SITE_URL: readValue(
    runtimeConfig?.VITE_CONVEX_SITE_URL,
    import.meta.env.VITE_CONVEX_SITE_URL
  ),
  VITE_CONVEX_URL: readValue(
    runtimeConfig?.VITE_CONVEX_URL,
    import.meta.env.VITE_CONVEX_URL
  ),
  VITE_PUBLIC_POSTHOG_HOST: readValue(
    runtimeConfig?.VITE_PUBLIC_POSTHOG_HOST,
    import.meta.env.VITE_PUBLIC_POSTHOG_HOST
  ),
  VITE_PUBLIC_POSTHOG_KEY: readValue(
    runtimeConfig?.VITE_PUBLIC_POSTHOG_KEY,
    import.meta.env.VITE_PUBLIC_POSTHOG_KEY
  ),
  VITE_SITE_URL: readValue(
    runtimeConfig?.VITE_SITE_URL,
    import.meta.env.VITE_SITE_URL
  ),
});
