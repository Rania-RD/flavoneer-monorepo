<script setup lang="ts">
import { ArrowLeft, Mail, Send } from 'lucide-vue-next'

const { trackCta, trackNavigation } = useLandingAnalytics()

const contactEmail = 'RaniaD@flavoneer.com'

useSeoMeta({
  title: 'Delete your account | Flavoneer',
  description:
    'Request deletion of your Flavoneer account and the personal information associated with it, across the Flavoneer workspace and mobile app.',
})

const steps = [
  'Fill in the form below with the email address you use to sign in to Flavoneer.',
  'Send the email it prepares, or email us directly from the address on your account.',
  'We confirm the request with you, and with your organization’s administrator if your account was provided by an organization.',
  'Your account is deleted within 30 days of confirmation, and we email you when it is done.',
]

const deletedData = [
  'Your name, email address, password hash, and profile details.',
  'Your organization memberships, roles, and notification preferences.',
  'Push notification tokens and sign-in sessions on all of your devices.',
  'Crash reports and diagnostic logs linked to your account.',
]

const retainedData = [
  {
    label: 'Organization workspace content',
    copy: 'Formulations, quality reports, production records, comments, and photos you created belong to your organization. They stay in its workspace, with your name replaced by “Deleted user” where needed.',
  },
  {
    label: 'Traceability and legal records',
    copy: 'Approval and audit entries required for food safety traceability or legal obligations are kept for as long as those obligations require, then deleted.',
  },
  {
    label: 'Backups',
    copy: 'Encrypted backups that contain your information are overwritten on their normal cycle, within 90 days of deletion.',
  },
]

const form = reactive({
  name: '',
  email: '',
  organization: '',
  reason: '',
  confirmed: false,
})

const canSubmit = computed(() => form.email.trim() !== '' && form.confirmed)

const mailtoHref = computed(() => {
  const subject = 'Account deletion request'
  const body = [
    'Please delete my Flavoneer account and associated personal information.',
    '',
    `Name: ${form.name.trim() || '-'}`,
    `Account email: ${form.email.trim()}`,
    `Organization: ${form.organization.trim() || '-'}`,
    `Reason (optional): ${form.reason.trim() || '-'}`,
    '',
    'I understand that deletion is permanent and cannot be undone.',
  ].join('\n')

  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
})

function submit() {
  if (!canSubmit.value) return
  trackCta({ destination: `mailto:${contactEmail}`, label: 'Send deletion request', placement: 'delete_account_form' })
  window.location.href = mailtoHref.value
}
</script>

<template>
  <div class="min-h-screen bg-[#e9f8ea] text-[#173e33]">
    <header class="bg-[#102f27] px-5 pb-16 pt-6 sm:px-8 sm:pb-20 lg:px-10">
      <div class="mx-auto flex max-w-[960px] items-center justify-between gap-5">
        <NuxtLink
          to="/"
          class="font-display text-3xl font-extrabold leading-none text-[#f5a623]"
          aria-label="Flavoneer home"
          @click="trackNavigation({ destination: '/', label: 'Home', placement: 'delete_account_header_logo' })"
        >
          flavoneer
        </NuxtLink>
        <NuxtLink
          to="/"
          class="group inline-flex items-center gap-2 rounded-full border-2 border-[#d2f2d4]/40 px-5 py-2 text-sm font-semibold text-[#d2f2d4] transition-colors hover:border-[#f5a623] hover:text-[#f5a623] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7738]"
          @click="trackNavigation({ destination: '/', label: 'Back to home', placement: 'delete_account_header' })"
        >
          <ArrowLeft :size="16" class="transition-transform group-hover:-translate-x-0.5" />
          Back to home
        </NuxtLink>
      </div>

      <div class="mx-auto mt-16 max-w-[960px] sm:mt-20">
        <p class="text-sm font-bold uppercase tracking-[0.18em] text-[#f5a623]">Account</p>
        <h1 class="font-display mt-4 text-4xl font-bold leading-[1.05] text-[#effbef] sm:text-5xl lg:text-6xl">
          Delete your account
        </h1>
        <p class="mt-5 max-w-[640px] text-base leading-7 text-[#b9d8c7] sm:text-lg">
          Request deletion of your Flavoneer account and the personal information linked to it. This covers the
          Flavoneer workspace and the Flavoneer mobile app for iOS and Android.
        </p>
      </div>
    </header>

    <main class="px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
      <div class="mx-auto max-w-[960px] space-y-12">
        <section id="how-it-works" class="scroll-mt-10">
          <h2 class="font-display text-2xl font-bold text-[#12382e] sm:text-3xl">How it works</h2>
          <ol class="mt-5 space-y-3">
            <li v-for="(step, index) in steps" :key="step" class="flex gap-4 leading-7 text-[#3f6356]">
              <span
                class="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#173e33] text-sm font-bold text-[#f5a623]"
                aria-hidden="true"
              >
                {{ index + 1 }}
              </span>
              {{ step }}
            </li>
          </ol>
        </section>

        <section id="what-is-deleted" class="scroll-mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 class="font-display text-2xl font-bold text-[#12382e] sm:text-3xl">What we delete</h2>
            <ul class="mt-5 space-y-2.5">
              <li v-for="item in deletedData" :key="item" class="flex gap-3 leading-7 text-[#3f6356]">
                <span class="mt-[0.7rem] size-2 shrink-0 rounded-full bg-[#f08232]" aria-hidden="true" />
                {{ item }}
              </li>
            </ul>
          </div>
          <div>
            <h2 class="font-display text-2xl font-bold text-[#12382e] sm:text-3xl">What we keep</h2>
            <dl class="mt-5 space-y-4">
              <div v-for="item in retainedData" :key="item.label" class="rounded-[8px] border border-[#b8d2bf] bg-white/70 p-5">
                <dt class="font-bold text-[#173e33]">{{ item.label }}</dt>
                <dd class="mt-1.5 leading-7 text-[#3f6356]">{{ item.copy }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section id="request" class="scroll-mt-10 rounded-[8px] border border-[#b8d2bf] bg-white/70 p-6 sm:p-8">
          <h2 class="font-display text-2xl font-bold text-[#12382e] sm:text-3xl">Request deletion</h2>
          <p class="mt-3 leading-7 text-[#3f6356]">
            Submitting opens your email app with the request filled in. Send it from the email address on your account
            so we can verify it is you.
          </p>

          <form class="mt-6 grid gap-5 sm:grid-cols-2" @submit.prevent="submit">
            <label class="flex flex-col gap-2 text-sm font-semibold text-[#173e33]">
              Full name
              <input
                v-model="form.name"
                type="text"
                autocomplete="name"
                class="rounded-[8px] border border-[#95b9a3] bg-white px-4 py-3 text-base font-normal text-[#173e33] outline-none focus:border-[#173e33] focus:ring-2 focus:ring-[#f5a623]/50"
              >
            </label>
            <label class="flex flex-col gap-2 text-sm font-semibold text-[#173e33]">
              Account email <span class="sr-only">(required)</span>
              <input
                v-model="form.email"
                type="email"
                required
                autocomplete="email"
                class="rounded-[8px] border border-[#95b9a3] bg-white px-4 py-3 text-base font-normal text-[#173e33] outline-none focus:border-[#173e33] focus:ring-2 focus:ring-[#f5a623]/50"
              >
            </label>
            <label class="flex flex-col gap-2 text-sm font-semibold text-[#173e33] sm:col-span-2">
              Organization
              <input
                v-model="form.organization"
                type="text"
                autocomplete="organization"
                class="rounded-[8px] border border-[#95b9a3] bg-white px-4 py-3 text-base font-normal text-[#173e33] outline-none focus:border-[#173e33] focus:ring-2 focus:ring-[#f5a623]/50"
              >
            </label>
            <label class="flex flex-col gap-2 text-sm font-semibold text-[#173e33] sm:col-span-2">
              Reason for leaving (optional)
              <textarea
                v-model="form.reason"
                rows="3"
                class="rounded-[8px] border border-[#95b9a3] bg-white px-4 py-3 text-base font-normal text-[#173e33] outline-none focus:border-[#173e33] focus:ring-2 focus:ring-[#f5a623]/50"
              />
            </label>
            <label class="flex items-start gap-3 leading-6 text-[#3f6356] sm:col-span-2">
              <input
                v-model="form.confirmed"
                type="checkbox"
                required
                class="mt-1 size-4 shrink-0 accent-[#173e33]"
              >
              I understand that deleting my account is permanent and cannot be undone.
            </label>
            <div class="sm:col-span-2">
              <button
                type="submit"
                :disabled="!canSubmit"
                class="inline-flex items-center gap-2 rounded-full bg-[#173e33] px-6 py-3 font-bold text-white transition-colors hover:bg-[#102f27] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send :size="18" />
                Send deletion request
              </button>
            </div>
          </form>
        </section>

        <section id="contact" class="scroll-mt-10 rounded-[8px] bg-[#f5a623] p-6 sm:p-8">
          <h2 class="font-display text-2xl font-bold text-[#173e33] sm:text-3xl">Prefer to email us directly?</h2>
          <p class="mt-3 leading-7 text-[#36594e]">
            Send a message with the subject “Account deletion request” from the email address on your account. See our
            <NuxtLink
              to="/privacy"
              class="font-semibold underline underline-offset-2"
              @click="trackNavigation({ destination: '/privacy', label: 'Privacy Policy', placement: 'delete_account_contact' })"
            >
              Privacy Policy
            </NuxtLink>
            for more on how we handle your information.
          </p>
          <a
            :href="`mailto:${contactEmail}?subject=${encodeURIComponent('Account deletion request')}`"
            class="mt-5 inline-flex items-center gap-2 rounded-full bg-[#173e33] px-6 py-3 font-bold text-white transition-colors hover:bg-[#102f27]"
          >
            <Mail :size="18" />
            {{ contactEmail }}
          </a>
        </section>
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
