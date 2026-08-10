import { type EnvInput, optionalString, parseEnv, urlWithDefault } from "./core";

const httpProtocols = ["http:", "https:"] as const;

const landingEnvSchema = {
  NUXT_PUBLIC_LAB_URL: urlWithDefault("https://lab.flavoneer.com", {
    protocols: httpProtocols,
  }),
  VITE_PUBLIC_POSTHOG_HOST: urlWithDefault("https://us.i.posthog.com", {
    protocols: httpProtocols,
  }),
  VITE_PUBLIC_POSTHOG_KEY: optionalString(),
};

export type LandingEnvSource = EnvInput<typeof landingEnvSchema>;

function normalizeLabUrl(value: string) {
  const url = new URL(value);
  if (url.hostname.toLowerCase() === "lab.flavoneer.com") {
    url.protocol = "https:";
  }
  return url.toString().replace(/\/$/, "");
}

export function createLandingEnv(source: LandingEnvSource) {
  const env = parseEnv(landingEnvSchema, source);
  return Object.freeze({
    labUrl: normalizeLabUrl(env.NUXT_PUBLIC_LAB_URL),
    posthogHost: env.VITE_PUBLIC_POSTHOG_HOST,
    posthogKey: env.VITE_PUBLIC_POSTHOG_KEY ?? "",
  });
}
