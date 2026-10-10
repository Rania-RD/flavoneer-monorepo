import { type EnvInput, parseEnv, requiredUrl } from "./core";

const httpProtocols = ["http:", "https:"] as const;

const mobileEnvSchema = {
  EXPO_PUBLIC_CONVEX_SITE_URL: requiredUrl({ protocols: httpProtocols }),
  EXPO_PUBLIC_CONVEX_URL: requiredUrl({ protocols: httpProtocols }),
};

export type MobileEnvSource = EnvInput<typeof mobileEnvSchema>;

export function createMobileEnv(source: MobileEnvSource) {
  const env = parseEnv(mobileEnvSchema, source);
  return Object.freeze({
    convexSiteUrl: env.EXPO_PUBLIC_CONVEX_SITE_URL,
    convexUrl: env.EXPO_PUBLIC_CONVEX_URL,
  });
}
