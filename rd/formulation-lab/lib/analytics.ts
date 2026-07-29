const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
const MAX_PENDING_EVENTS = 50;
const DYNAMIC_ROUTE_PATTERNS = [
  { pattern: /^\/evaluate\/[^/]+/, replacement: "/evaluate/:token" },
  { pattern: /^\/project\/[^/]+/, replacement: "/project/:id" },
  { pattern: /^\/reports\/[^/]+/, replacement: "/reports/:id" },
  { pattern: /^\/run\/[^/]+/, replacement: "/run/:id" },
  { pattern: /^\/share\/[^/]+/, replacement: "/share/:token" },
] as const;

type AnalyticsPrimitive = boolean | number | string | null | undefined;

export type AnalyticsProperties = Record<string, AnalyticsPrimitive>;

export type LabAnalyticsEvent =
  | "lab_formulation_status_changed"
  | "lab_gsfa_category_selected"
  | "lab_ingredient_saved"
  | "lab_inventory_exported"
  | "lab_material_created"
  | "lab_navigation_clicked"
  | "lab_profile_menu_action"
  | "lab_profile_menu_toggled"
  | "lab_project_created"
  | "lab_project_deleted"
  | "lab_project_duplicated"
  | "lab_project_locale_changed"
  | "lab_project_opened"
  | "lab_project_updated"
  | "lab_report_created"
  | "lab_report_exported"
  | "lab_report_status_changed"
  | "lab_run_completed"
  | "lab_run_draft_saved"
  | "lab_run_started"
  | "lab_sensory_response_submitted"
  | "lab_user_signed_out";

interface PostHogClient {
  capture: (event: string, properties?: AnalyticsProperties) => unknown;
  identify: (distinctId: string) => void;
  init: (
    token: string,
    options: {
      api_host: string;
      autocapture: boolean;
      capture_pageleave: boolean;
      capture_pageview: boolean;
      defaults: "2026-05-30";
      disable_session_recording: boolean;
      person_profiles: "identified_only";
    }
  ) => void;
  reset: () => void;
}

interface PendingEvent {
  event: LabAnalyticsEvent | "$pageview";
  properties?: AnalyticsProperties;
}

let client: PostHogClient | null = null;
let initializationStarted = false;
let analyticsDisabled = false;
let pendingIdentity: string | null = null;
let lastPageViewUrl = "";
const pendingEvents: PendingEvent[] = [];

const capture = (
  event: LabAnalyticsEvent | "$pageview",
  properties?: AnalyticsProperties
) => {
  if (analyticsDisabled) {
    return;
  }

  if (!client) {
    if (pendingEvents.length < MAX_PENDING_EVENTS) {
      pendingEvents.push({ event, properties });
    }
    return;
  }

  try {
    client.capture(event, properties);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[analytics] PostHog event capture failed.", error);
    }
  }
};

export const initializeAnalytics = () => {
  if (typeof window === "undefined" || initializationStarted) {
    return;
  }

  const apiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY?.trim();
  if (!apiKey) {
    analyticsDisabled = true;
    return;
  }

  initializationStarted = true;
  const apiHost =
    import.meta.env.VITE_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;

  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(apiKey, {
        api_host: apiHost,
        autocapture: false,
        capture_pageleave: true,
        capture_pageview: false,
        defaults: "2026-05-30",
        disable_session_recording: true,
        person_profiles: "identified_only",
      });

      client = posthog as PostHogClient;
      if (pendingIdentity) {
        client.identify(pendingIdentity);
      }
      for (const pendingEvent of pendingEvents.splice(0)) {
        capture(pendingEvent.event, pendingEvent.properties);
      }
    })
    .catch((error) => {
      analyticsDisabled = true;
      pendingEvents.length = 0;
      if (import.meta.env.DEV) {
        console.warn(
          "[analytics] PostHog initialization failed; analytics is disabled.",
          error
        );
      }
    });
};

export const identifyAnalyticsUser = (userId: string) => {
  pendingIdentity = userId;
  if (!client) {
    return;
  }

  try {
    client.identify(userId);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[analytics] PostHog identification failed.", error);
    }
  }
};

export const resetAnalyticsUser = () => {
  pendingIdentity = null;
  if (!client) {
    return;
  }

  try {
    client.reset();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[analytics] PostHog reset failed.", error);
    }
  }
};

export const trackLabEvent = (
  event: LabAnalyticsEvent,
  properties?: AnalyticsProperties
) => {
  capture(event, properties);
};

export const trackPageView = (pathname: string, search: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const rawCurrentUrl = `${window.location.origin}${pathname}${search}`;
  if (rawCurrentUrl === lastPageViewUrl) {
    return;
  }

  lastPageViewUrl = rawCurrentUrl;
  const sanitizedPathname =
    DYNAMIC_ROUTE_PATTERNS.find(({ pattern }) => pattern.test(pathname))
      ?.replacement ?? pathname;
  const tab = new URLSearchParams(search).get("tab");
  const sanitizedSearch = tab ? `?tab=${encodeURIComponent(tab)}` : "";
  const sanitizedUrl = `${window.location.origin}${sanitizedPathname}${sanitizedSearch}`;

  capture("$pageview", {
    $current_url: sanitizedUrl,
    path: sanitizedPathname,
    search: sanitizedSearch,
  });
};
