// biome-ignore-all lint/suspicious/noTemplateCurlyInString: Docker envsubst replaces these placeholders when the container starts.
window.__FLAVONEER_RUNTIME_CONFIG__ = {
  VITE_CONVEX_URL: "${VITE_CONVEX_URL}",
  VITE_CONVEX_SITE_URL: "${VITE_CONVEX_SITE_URL}",
  VITE_SITE_URL: "${VITE_SITE_URL}",
  VITE_PUBLIC_POSTHOG_KEY: "${VITE_PUBLIC_POSTHOG_KEY}",
  VITE_PUBLIC_POSTHOG_HOST: "${VITE_PUBLIC_POSTHOG_HOST}",
};
