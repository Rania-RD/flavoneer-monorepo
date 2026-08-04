import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()]
  },
  runtimeConfig: {
    public: {
      labUrl: process.env.NUXT_PUBLIC_LAB_URL || 'https://lab.flavoneer.com',
      posthogHost:
        process.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      posthogKey: process.env.VITE_PUBLIC_POSTHOG_KEY || ''
    }
  },
  app: {
    head: {
      title: 'Flavoneer | Food Formulation Intelligence',
      meta: [
        {
          name: 'description',
          content: 'Flavoneer gives food R&D teams one intelligent workspace for formulation, compliance, costing, and scale-up.'
        },
        { name: 'theme-color', content: '#1c4a3c' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,700;9..144,800&display=swap'
        }
      ]
    }
  }
})
