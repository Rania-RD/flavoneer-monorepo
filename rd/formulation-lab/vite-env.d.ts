/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_SITE_URL?: string;
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_PUBLIC_POSTHOG_HOST?: string;
  readonly VITE_PUBLIC_POSTHOG_KEY?: string;
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
