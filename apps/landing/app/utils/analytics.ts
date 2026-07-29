export const LANDING_ANALYTICS_EVENTS = {
  ctaClicked: 'landing_cta_clicked',
  mobileMenuToggled: 'landing_mobile_menu_toggled',
  navigationClicked: 'landing_navigation_clicked',
} as const

export type LandingAnalyticsEvent =
  (typeof LANDING_ANALYTICS_EVENTS)[keyof typeof LANDING_ANALYTICS_EVENTS]

export type LandingAnalyticsProperties = Record<
  string,
  boolean | number | string
>

export interface LandingAnalyticsClient {
  capture: (
    event: LandingAnalyticsEvent,
    properties: LandingAnalyticsProperties,
  ) => void
  enabled: boolean
}

export function createNoopAnalyticsClient(): LandingAnalyticsClient {
  return {
    capture: () => undefined,
    enabled: false,
  }
}
