import { createLandingEnv } from '@flavoneer/config/env/landing'
import tailwindcss from '@tailwindcss/vite'

const configuredLabUrl = process.env.NUXT_PUBLIC_LAB_URL?.trim()
const defaultLabUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://lab.flavoneer.com'
    : 'http://localhost:3001'

const env = createLandingEnv({
  NUXT_PUBLIC_LAB_URL: configuredLabUrl || defaultLabUrl,
  VITE_PUBLIC_POSTHOG_HOST: process.env.VITE_PUBLIC_POSTHOG_HOST,
  VITE_PUBLIC_POSTHOG_KEY: process.env.VITE_PUBLIC_POSTHOG_KEY,
})

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    public: {
      labUrl: env.labUrl,
      posthogHost: env.posthogHost,
      posthogKey: env.posthogKey,
    },
  },
  app: {
    head: {
      title: 'Flavoneer | Food Formulation Intelligence',
      meta: [
        {
          name: 'description',
          content:
            'Flavoneer gives food R&D organizations one intelligent workspace for formulation, compliance, costing, and scale-up.',
        },
        { name: 'theme-color', content: '#1c4a3c' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/assets/flavoneer-logo-f.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,700;9..144,800&display=swap',
        },
      ],
    },
  },
})
