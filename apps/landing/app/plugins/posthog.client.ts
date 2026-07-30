import posthog from 'posthog-js'
import type { CaptureResult } from 'posthog-js'
import {
  createNoopAnalyticsClient,
  type LandingAnalyticsClient,
} from '~/utils/analytics'

const APP_SURFACE = 'landing'
const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

function attachAppSurface(event: CaptureResult | null): CaptureResult | null {
  if (!event) {
    return null
  }

  return {
    ...event,
    properties: {
      ...event.properties,
      app_surface: APP_SURFACE,
    },
  }
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const apiKey = String(config.public.posthogKey ?? '').trim()
  const apiHost =
    String(config.public.posthogHost ?? '').trim() || DEFAULT_POSTHOG_HOST

  let analytics = createNoopAnalyticsClient()

  if (!apiKey) {
    return {
      provide: {
        analytics,
      },
    }
  }

  try {
    posthog.init(apiKey, {
      api_host: apiHost,
      autocapture: false,
      before_send: attachAppSurface,
      capture_pageleave: true,
      capture_pageview: true,
      disable_session_recording: true,
      person_profiles: 'identified_only',
    })

    analytics = {
      capture(event, properties) {
        try {
          posthog.capture(event, properties, {
            send_instantly: true,
            transport: 'sendBeacon',
          })
        } catch (error) {
          if (import.meta.dev) {
            console.warn('[analytics] PostHog event capture failed.', error)
          }
        }
      },
      enabled: true,
    } satisfies LandingAnalyticsClient
  } catch (error) {
    if (import.meta.dev) {
      console.warn(
        '[analytics] PostHog initialization failed; analytics is disabled.',
        error,
      )
    }
  }

  return {
    provide: {
      analytics,
    },
  }
})
