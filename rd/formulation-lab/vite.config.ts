import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

const getSecureOrigin = (value: string | undefined) => {
  if (!value) {
    return;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : undefined;
  } catch {
    return;
  }
};

const buildContentSecurityPolicy = (posthogHost: string | undefined) => {
  const posthogSources = ["https://*.posthog.com", getSecureOrigin(posthogHost)]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' ${posthogSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${posthogSources} https://*.convex.cloud https://*.convex.site wss://*.convex.cloud wss://*.convex.site`,
    "worker-src 'self' blob: data:",
    "media-src 'self' blob: data:",
    "manifest-src 'self'",
  ].join("; ");
};

const emitSecurityHeaders = (contentSecurityPolicy: string): Plugin => ({
  apply: "build",
  generateBundle() {
    this.emitFile({
      fileName: "_headers",
      source: `/*\n  Content-Security-Policy: ${contentSecurityPolicy}\n`,
      type: "asset",
    });
  },
  name: "emit-security-headers",
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const contentSecurityPolicy = buildContentSecurityPolicy(
    env.VITE_PUBLIC_POSTHOG_HOST
  );

  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    preview: {
      headers: {
        "Content-Security-Policy": contentSecurityPolicy,
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      emitSecurityHeaders(contentSecurityPolicy),
    ],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "."),
      },
    },
  };
});
