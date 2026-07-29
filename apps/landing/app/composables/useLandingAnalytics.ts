import {
  createNoopAnalyticsClient,
  LANDING_ANALYTICS_EVENTS,
} from '~/utils/analytics'

interface TrackedInteraction {
  destination: string
  label: string
  placement: string
}

function destinationType(destination: string) {
  return destination.startsWith('#') ? 'on_page' : 'workspace'
}

export function useLandingAnalytics() {
  const analytics =
    useNuxtApp().$analytics ?? createNoopAnalyticsClient()

  function baseProperties() {
    return {
      page_path: window.location.pathname,
    }
  }

  function trackCta({
    destination,
    label,
    placement,
  }: TrackedInteraction) {
    analytics.capture(LANDING_ANALYTICS_EVENTS.ctaClicked, {
      ...baseProperties(),
      cta_label: label,
      destination,
      destination_type: destinationType(destination),
      placement,
    })
  }

  function trackNavigation({
    destination,
    label,
    placement,
  }: TrackedInteraction) {
    analytics.capture(LANDING_ANALYTICS_EVENTS.navigationClicked, {
      ...baseProperties(),
      destination,
      destination_type: destinationType(destination),
      navigation_label: label,
      placement,
    })
  }

  function trackMobileMenuToggle(open: boolean) {
    analytics.capture(LANDING_ANALYTICS_EVENTS.mobileMenuToggled, {
      ...baseProperties(),
      menu_state: open ? 'open' : 'closed',
      placement: 'mobile_header',
    })
  }

  return {
    analyticsEnabled: analytics.enabled,
    trackCta,
    trackMobileMenuToggle,
    trackNavigation,
  }
}
