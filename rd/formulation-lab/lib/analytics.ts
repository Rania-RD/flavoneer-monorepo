import type { CaptureResult, PostHog } from "posthog-js";
import { publicConfig } from "./runtime-config";

const APP_SURFACE = "formulation_lab";
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

let posthogClient: PostHog | null = null;
let initializationStarted = false;

const attachAppSurface = (
  event: CaptureResult | null
): CaptureResult | null => {
  if (!event) {
    return null;
  }

  return {
    ...event,
    properties: {
      ...event.properties,
      app_surface: APP_SURFACE,
    },
  };
};

export const initializeAnalytics = (): void => {
  if (typeof window === "undefined" || initializationStarted) {
    return;
  }

  const apiKey = publicConfig.posthogKey;
  if (!apiKey) {
    return;
  }

  initializationStarted = true;
  const apiHost = publicConfig.posthogHost || DEFAULT_POSTHOG_HOST;

  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(apiKey, {
        api_host: apiHost,
        autocapture: false,
        before_send: attachAppSurface,
        capture_pageleave: true,
        capture_pageview: true,
        defaults: "2026-05-30",
        disable_session_recording: true,
        person_profiles: "identified_only",
      });
      posthogClient = posthog;
    })
    .catch((error: unknown) => {
      initializationStarted = false;
      if (import.meta.env.DEV) {
        console.warn(
          "PostHog initialization failed; analytics is disabled.",
          error
        );
      }
    });
};

export const getAnalyticsClient = (): PostHog | null => posthogClient;
