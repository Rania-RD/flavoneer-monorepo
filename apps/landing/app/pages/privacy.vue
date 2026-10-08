<script setup lang="ts">
import { ArrowLeft, Mail } from 'lucide-vue-next'

const { trackNavigation } = useLandingAnalytics()

const effectiveDate = 'October 8, 2026'
const contactEmail = 'RaniaD@flavoneer.com'

useSeoMeta({
  title: 'Privacy Policy | Flavoneer',
  description:
    'How Flavoneer collects, uses, and protects information across the website, the Flavoneer workspace, and the Flavoneer mobile app.',
})

const sections = [
  {
    id: 'scope',
    title: 'Scope',
    paragraphs: [
      'This policy explains how Flavoneer handles information when you visit flavoneer.com, use the Flavoneer workspace at lab.flavoneer.com, or use the Flavoneer mobile app for iOS and Android.',
      'Flavoneer is used by organizations to manage food formulation, quality, and production work. When your employer or another organization gives you access, that organization controls the workspace content you create, and its own policies may also apply.',
    ],
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    paragraphs: [],
    items: [
      {
        label: 'Account information',
        copy: 'Your name, email address, password (stored only as a hash), organization membership, and role.',
      },
      {
        label: 'Workspace content',
        copy: 'Formulations, ingredients, specifications, quality reports, production records, comments, and files or photos you upload.',
      },
      {
        label: 'Device features in the mobile app',
        copy: 'With your permission, the app uses the camera to photograph carton labels, your photo library to attach production record photos, and NFC to read tags on production equipment. These are used only when you start the action.',
      },
      {
        label: 'Biometric confirmation',
        copy: 'Face ID, Touch ID, or Android biometrics can be used to confirm quality approvals. Verification happens on your device. Flavoneer never receives or stores your biometric data.',
      },
      {
        label: 'Usage and diagnostics',
        copy: 'Pages visited and buttons clicked on this website, plus crash reports and error logs from our apps, including device model, operating system, and app version.',
      },
    ],
  },
  {
    id: 'how-we-use-information',
    title: 'How we use information',
    paragraphs: [],
    bullets: [
      'Provide, operate, and secure the Flavoneer website, workspace, and mobile app.',
      'Authenticate you and keep your organization’s data separated from other organizations.',
      'Send notifications you have enabled, such as quality approvals and production alerts.',
      'Diagnose crashes, fix bugs, and deliver app updates.',
      'Understand which parts of the website are useful so we can improve it.',
    ],
    closing: 'We do not sell personal information, and we do not use workspace content for advertising.',
  },
  {
    id: 'cookies-and-analytics',
    title: 'Cookies and analytics',
    paragraphs: [
      'This website uses PostHog for product analytics. It records page views and clicks on navigation and call-to-action links. Session recording and automatic capture of all interactions are turned off. PostHog stores a cookie or local storage identifier so visits can be counted without creating a personal profile.',
      'The workspace uses essential cookies to keep you signed in. You can block or delete cookies in your browser settings, although signing in requires them.',
    ],
  },
  {
    id: 'sharing',
    title: 'How information is shared',
    paragraphs: [
      'We share information only with service providers that help us run Flavoneer, such as cloud hosting and database providers, analytics, error monitoring, and push notification services. They process data on our instructions and may not use it for their own purposes.',
      'Members of your organization can see workspace content according to the roles your organization assigns. We may also disclose information when required by law or to protect the rights and safety of our users.',
    ],
  },
  {
    id: 'retention-and-security',
    title: 'Retention and security',
    paragraphs: [
      'We keep account information and workspace content for as long as your account or your organization’s workspace is active. Records may be kept longer when traceability or legal obligations require it. Diagnostic logs are kept only as long as needed to investigate issues.',
      'Data is encrypted in transit, and access to production systems is restricted to authorized personnel. Sign-in tokens on mobile devices are stored in the device’s secure storage.',
    ],
  },
  {
    id: 'your-choices',
    title: 'Your rights and choices',
    paragraphs: [
      'Depending on where you live, you may have the right to access, correct, export, or delete your personal information, and to object to or restrict certain processing. You can withdraw camera, photo, NFC, notification, and biometric permissions at any time in your device settings.',
      'If your account was provided by an organization, we may refer your request to that organization. To make a request, contact us using the address below.',
    ],
  },
  {
    id: 'children',
    title: 'Children',
    paragraphs: [
      'Flavoneer is a professional tool and is not directed to children under 16. We do not knowingly collect information from children.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    paragraphs: [
      'We will post any changes on this page and update the effective date. If a change materially affects how we use your information, we will notify account holders before it takes effect.',
    ],
  },
]
</script>

<template>
  <div class="min-h-screen bg-[#e9f8ea] text-[#173e33]">
    <header class="bg-[#102f27] px-5 pb-16 pt-6 sm:px-8 sm:pb-20 lg:px-10">
      <div class="mx-auto flex max-w-[960px] items-center justify-between gap-5">
        <NuxtLink
          to="/"
          class="font-display text-3xl font-extrabold leading-none text-[#f5a623]"
          aria-label="Flavoneer home"
          @click="trackNavigation({ destination: '/', label: 'Home', placement: 'privacy_header_logo' })"
        >
          flavoneer
        </NuxtLink>
        <NuxtLink
          to="/"
          class="group inline-flex items-center gap-2 rounded-full border-2 border-[#d2f2d4]/40 px-5 py-2 text-sm font-semibold text-[#d2f2d4] transition-colors hover:border-[#f5a623] hover:text-[#f5a623] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7738]"
          @click="trackNavigation({ destination: '/', label: 'Back to home', placement: 'privacy_header' })"
        >
          <ArrowLeft :size="16" class="transition-transform group-hover:-translate-x-0.5" />
          Back to home
        </NuxtLink>
      </div>

      <div class="mx-auto mt-16 max-w-[960px] sm:mt-20">
        <p class="text-sm font-bold uppercase tracking-[0.18em] text-[#f5a623]">Legal</p>
        <h1 class="font-display mt-4 text-4xl font-bold leading-[1.05] text-[#effbef] sm:text-5xl lg:text-6xl">
          Privacy Policy
        </h1>
        <p class="mt-5 text-base text-[#b9d8c7] sm:text-lg">Effective {{ effectiveDate }}</p>
      </div>
    </header>

    <main class="px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
      <div class="mx-auto grid max-w-[960px] gap-12 lg:grid-cols-[220px_1fr]">
        <nav class="hidden lg:block" aria-label="Policy sections">
          <ol class="sticky top-10 space-y-3 border-l-2 border-[#95b9a3] pl-5 text-sm font-semibold text-[#557367]">
            <li v-for="section in sections" :key="section.id">
              <a :href="`#${section.id}`" class="transition-colors hover:text-[#e5792e]">{{ section.title }}</a>
            </li>
            <li>
              <a href="#contact" class="transition-colors hover:text-[#e5792e]">Contact us</a>
            </li>
          </ol>
        </nav>

        <div class="space-y-12">
          <section v-for="section in sections" :id="section.id" :key="section.id" class="scroll-mt-10">
            <h2 class="font-display text-2xl font-bold text-[#12382e] sm:text-3xl">{{ section.title }}</h2>
            <p v-for="paragraph in section.paragraphs" :key="paragraph" class="mt-4 leading-7 text-[#3f6356]">
              {{ paragraph }}
            </p>
            <dl v-if="section.items" class="mt-5 space-y-4">
              <div v-for="item in section.items" :key="item.label" class="rounded-[8px] border border-[#b8d2bf] bg-white/70 p-5">
                <dt class="font-bold text-[#173e33]">{{ item.label }}</dt>
                <dd class="mt-1.5 leading-7 text-[#3f6356]">{{ item.copy }}</dd>
              </div>
            </dl>
            <ul v-if="section.bullets" class="mt-5 space-y-2.5">
              <li v-for="bullet in section.bullets" :key="bullet" class="flex gap-3 leading-7 text-[#3f6356]">
                <span class="mt-[0.7rem] size-2 shrink-0 rounded-full bg-[#f08232]" aria-hidden="true" />
                {{ bullet }}
              </li>
            </ul>
            <p v-if="section.closing" class="mt-5 font-semibold leading-7 text-[#173e33]">{{ section.closing }}</p>
          </section>

          <section id="contact" class="scroll-mt-10 rounded-[8px] bg-[#f5a623] p-6 sm:p-8">
            <h2 class="font-display text-2xl font-bold text-[#173e33] sm:text-3xl">Contact us</h2>
            <p class="mt-3 leading-7 text-[#36594e]">
              Questions about this policy or requests about your information can be sent to us by email.
            </p>
            <a
              :href="`mailto:${contactEmail}`"
              class="mt-5 inline-flex items-center gap-2 rounded-full bg-[#173e33] px-6 py-3 font-bold text-white transition-colors hover:bg-[#102f27]"
            >
              <Mail :size="18" />
              {{ contactEmail }}
            </a>
          </section>
        </div>
      </div>
    </main>

    <footer class="bg-[#102f27] px-5 py-8 text-xs text-[#7fa495] sm:px-8 lg:px-10">
      <div class="mx-auto flex max-w-[960px] flex-col gap-2 sm:flex-row sm:justify-between">
        <p>© {{ new Date().getFullYear() }} Flavoneer. Food innovation, structured.</p>
        <NuxtLink to="/" class="font-semibold transition-colors hover:text-white">flavoneer.com</NuxtLink>
      </div>
    </footer>
  </div>
</template>
