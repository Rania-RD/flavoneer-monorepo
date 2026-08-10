import { type EnvInput, optionalString, optionalUrl, parseEnv, urlWithDefault } from "./core";

const httpProtocols = ["http:", "https:"] as const;

const formulationLabEnvSchema = {
  VITE_CONVEX_SITE_URL: optionalUrl({ protocols: httpProtocols }),
  VITE_CONVEX_URL: optionalUrl({ protocols: httpProtocols }),
  VITE_PUBLIC_POSTHOG_HOST: urlWithDefault("https://us.i.posthog.com", {
    protocols: httpProtocols,
  }),
  VITE_PUBLIC_POSTHOG_KEY: optionalString(),
  VITE_SITE_URL: optionalUrl({ protocols: httpProtocols }),
};

export type FormulationLabEnvSource = EnvInput<typeof formulationLabEnvSchema>;

export function createFormulationLabEnv(source: FormulationLabEnvSource) {
  const env = parseEnv(formulationLabEnvSchema, source);
  return Object.freeze({
    convexSiteUrl: env.VITE_CONVEX_SITE_URL,
    convexUrl: env.VITE_CONVEX_URL,
    posthogHost: env.VITE_PUBLIC_POSTHOG_HOST,
    posthogKey: env.VITE_PUBLIC_POSTHOG_KEY,
    siteUrl: env.VITE_SITE_URL,
  });
}
