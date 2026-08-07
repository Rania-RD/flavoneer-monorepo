<script setup lang="ts">
import {
  ArrowRight,
  ArrowUpRight,
  Beaker,
  Check,
  FlaskConical,
  Gauge,
  Menu,
  Network,
  Play,
  Scale,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-vue-next'

const config = useRuntimeConfig()
const mobileMenuOpen = ref(false)
const { trackCta, trackMobileMenuToggle, trackNavigation } =
  useLandingAnalytics()

const navItems = [
  { label: 'Solutions', href: '#solutions' },
  { label: 'Technology', href: '#technology' },
]

const capabilities = [
  {
    icon: Scale,
    eyebrow: 'Formula intelligence',
    title: 'Mass balance that never drifts.',
    copy: 'Normalize every unit, reconcile batch yield, and expose formulation gaps before they reach pilot production.',
    tone: 'mint',
  },
  {
    icon: Network,
    eyebrow: 'Connected materials',
    title: 'One source of truth for every ingredient.',
    copy: 'Live costs, nutrition, supplier data, and technical properties flow directly into every active recipe.',
    tone: 'amber',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Dynamic allergen mapping',
    title: 'Compliance recalculates as you formulate.',
    copy: 'Ingredient changes instantly refresh allergen declarations and surface cross-contact overrides for review.',
    tone: 'orange',
  },
  {
    icon: Beaker,
    eyebrow: 'Scale-up readiness',
    title: 'Trials stay connected from bench to plant.',
    copy: 'Processing parameters, observations, and release decisions remain attached to the exact version that produced them.',
    tone: 'ice',
  },
]

const workflowSteps = [
  { number: '01', title: 'Build', copy: 'Structure phases, processing steps, quantities, and target yields.' },
  { number: '02', title: 'Validate', copy: 'Check limits, allergens, nutrition, costs, and mass balance in real time.' },
  { number: '03', title: 'Release', copy: 'Lock approved versions and create factory-ready specifications.' },
]

const labHref = computed(() => String(config.public.labUrl))

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

function toggleMobileMenu() {
  const nextOpen = !mobileMenuOpen.value

  mobileMenuOpen.value = nextOpen
  trackMobileMenuToggle(nextOpen)
}

function handleMobileNavigation(label: string, destination: string) {
  trackNavigation({
    destination,
    label,
    placement: 'mobile_menu',
  })
  closeMobileMenu()
}
</script>

<template>
  <div class="min-h-screen overflow-x-hidden bg-[#d2f2d4]">
    <NuxtRouteAnnouncer />

    <header class="absolute inset-x-0 top-0 z-50 px-4 pt-4 sm:px-7 sm:pt-6 lg:px-10">
      <div class="mx-auto flex max-w-[1440px] items-center justify-between gap-5">
        <a
          href="#top"
          class="group inline-flex items-center"
          aria-label="Flavoneer home"
          @click="trackNavigation({ destination: '#top', label: 'Home', placement: 'header_logo' })"
        >
          <span aria-hidden="true" class="font-display text-[2rem] font-extrabold leading-none text-[#f5a623] drop-shadow-[0_2px_0_rgba(16,47,39,0.16)] sm:text-[2.65rem]">
            flav<span class="brand-pan-o"><span class="brand-pan-face"><img src="/assets/flavoneer-mascot.png" alt=""></span></span>neer
          </span>
        </a>

        <nav class="hidden items-center gap-2 rounded-full border-2 border-[#1c4a3c]/55 bg-[#dff7e1]/80 p-2 backdrop-blur-md md:flex" aria-label="Primary navigation">
          <a
            v-for="item in navItems"
            :key="item.label"
            :href="item.href"
            class="rounded-full bg-[#1c4a3c] px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-[#12382e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7738]"
            @click="trackNavigation({ destination: item.href, label: item.label, placement: 'desktop_header' })"
          >
            {{ item.label }}
          </a>
          <a
            :href="`${labHref}/login`"
            class="rounded-full bg-[#1c4a3c] px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-[#12382e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7738]"
            @click="trackCta({ destination: `${labHref}/login`, label: 'Log in', placement: 'desktop_header' })"
          >
            Log in
          </a>
          <a
            :href="labHref"
            class="rounded-full bg-[#f5a623] px-7 py-2.5 text-sm font-bold text-[#173e33] shadow-[inset_0_-3px_0_rgba(182,97,8,0.22)] transition-all duration-300 hover:scale-105 hover:bg-[#ffb43b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7738]"
            @click="trackCta({ destination: labHref, label: 'Get started', placement: 'desktop_header' })"
          >
            Get started
          </a>
        </nav>

        <button
          type="button"
          class="grid size-11 place-items-center rounded-full border-2 border-[#1c4a3c]/45 bg-[#e7f9e7] text-[#1c4a3c] md:hidden"
          :aria-expanded="mobileMenuOpen"
          aria-controls="mobile-navigation"
          aria-label="Toggle navigation"
          @click="toggleMobileMenu"
        >
          <X v-if="mobileMenuOpen" :size="21" />
          <Menu v-else :size="21" />
        </button>
      </div>

      <div
        id="mobile-navigation"
        class="mx-auto mt-3 max-w-[1440px] overflow-hidden rounded-[8px] border border-[#1c4a3c]/20 bg-[#effbef] p-3 shadow-xl md:hidden"
        :class="mobileMenuOpen ? 'block' : 'hidden'"
      >
        <a
          v-for="item in navItems"
          :key="item.label"
          :href="item.href"
          class="block border-b border-[#1c4a3c]/10 px-3 py-3 font-semibold text-[#1c4a3c]"
          @click="handleMobileNavigation(item.label, item.href)"
        >
          {{ item.label }}
        </a>
        <div class="grid grid-cols-2 gap-2 pt-3">
          <a
            :href="`${labHref}/login`"
            class="rounded-full bg-[#1c4a3c] px-4 py-3 text-center text-sm font-bold text-white"
            @click="trackCta({ destination: `${labHref}/login`, label: 'Log in', placement: 'mobile_menu' })"
          >
            Log in
          </a>
          <a
            :href="labHref"
            class="rounded-full bg-[#f5a623] px-4 py-3 text-center text-sm font-bold text-[#173e33]"
            @click="trackCta({ destination: labHref, label: 'Get started', placement: 'mobile_menu' })"
          >
            Get started
          </a>
        </div>
      </div>
    </header>

    <main>
      <section id="top" class="relative min-h-[790px] overflow-hidden bg-[#d2f2d4] sm:min-h-[860px] lg:min-h-[900px]">
        <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span class="particle left-[61%] top-[12%] size-5" />
          <span class="particle left-[86%] top-[23%] size-9" />
          <span class="particle left-[55%] top-[72%] size-4" />
          <span class="particle left-[92%] top-[67%] size-6" />
          <span class="particle left-[73%] top-[84%] size-3" />
          <span class="particle left-[47%] top-[34%] size-7" />
        </div>

        <svg
          class="hero-wave pointer-events-none absolute inset-y-0 left-0 hidden h-full w-[58%] lg:block"
          viewBox="0 0 760 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="#1c4a3c"
            d="M0 0H330C285 92 676 57 553 264C465 411 680 397 604 579C552 704 758 707 663 866C623 934 661 978 708 1000H0V0Z"
          />
        </svg>

        <div class="absolute inset-x-0 bottom-0 h-[20%] bg-[#1c4a3c] lg:hidden" aria-hidden="true" />
        <div class="absolute bottom-[3%] left-[-38%] h-[27%] w-[112%] -rotate-6 rounded-[48%] bg-[#1c4a3c] sm:left-[-24%] sm:h-[30%] sm:w-[88%] lg:hidden" aria-hidden="true" />

        <div class="relative z-10 mx-auto grid min-h-[790px] max-w-[1440px] items-center px-5 pb-16 pt-28 sm:min-h-[860px] sm:px-8 sm:pb-24 sm:pt-36 lg:min-h-[900px] lg:grid-cols-[48%_52%] lg:px-10 lg:pb-24 lg:pt-28">
          <div class="relative order-2 h-[260px] self-end sm:h-[310px] lg:order-1 lg:h-full" aria-hidden="true" />

          <div class="order-1 mx-auto max-w-[710px] self-center text-center lg:order-2 lg:mt-4 lg:pr-4">
            <p class="mb-7 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-[#1c4a3c]/20 bg-white/35 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#1c4a3c] backdrop-blur-sm sm:mb-8 sm:px-4 sm:text-sm sm:tracking-[0.16em]">
              <Sparkles :size="16" class="text-[#e27a20]" />
              Built for modern food R&amp;D
            </p>
            <h1 class="font-display relative z-10 mx-auto max-w-[710px] text-[1.85rem] font-extrabold leading-[1.03] text-[#12382e] sm:text-[3.15rem] lg:text-[3.35rem] xl:text-[3.75rem] 2xl:text-[4rem]">
              <span class="orange-loop relative inline-grid place-items-center">
                <svg
                  class="orange-loop-frame absolute inset-0 size-full"
                  viewBox="0 0 800 500"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    class="orange-loop-stroke orange-loop-stroke-primary"
                    d="M112 31C266 4 584 5 699 40C771 63 794 140 787 245C781 349 755 423 676 462C535 493 250 494 104 459C28 431 9 345 15 242C21 137 43 61 112 31Z"
                  />
                  <path
                    class="orange-loop-stroke orange-loop-stroke-secondary"
                    d="M96 48C244 13 592 12 714 53C779 81 790 157 778 253C769 352 739 416 660 451C516 481 226 482 88 445C24 407 21 325 29 224C36 130 54 70 96 48Z"
                  />
                </svg>
                <span class="orange-loop-copy relative z-10 flex flex-col items-center">
                  <span class="block">The Intelligent</span>
                  <span class="block">Workspace for</span>
                  <span class="block">Food</span>
                  <span class="block">Formulations</span>
                </span>
              </span>
            </h1>
            <div class="mx-auto mt-10 w-full max-w-[640px] sm:mt-14">
              <p class="relative z-20 mx-auto w-full max-w-[34rem] text-pretty text-[0.95rem] font-medium leading-6 text-[#285b4d] sm:text-lg sm:leading-8 lg:ml-[clamp(6rem,8vw,8rem)] lg:mr-0 lg:w-[calc(100%_-_clamp(6rem,8vw,8rem))]">
                Accelerate R&amp;D with precision. Manage complex ingredient systems while tracking FDA and EU regulatory frameworks in real time, from benchtop trial to factory release.
              </p>
              <div class="mt-8 flex flex-wrap items-center justify-center gap-3 lg:flex-col xl:flex-row">
                <a
                  href="#technology"
                  class="group inline-flex items-center gap-3 rounded-full bg-[#f5a623] px-6 py-3.5 font-bold text-[#173e33] shadow-[inset_0_-4px_0_rgba(182,97,8,0.23),0_10px_24px_rgba(28,74,60,0.13)] transition-all duration-300 hover:scale-105 hover:bg-[#ffb43b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7738]"
                  @click="trackCta({ destination: '#technology', label: 'Live demo', placement: 'hero' })"
                >
                  <span class="grid size-7 place-items-center rounded-full bg-[#1c4a3c] text-[#f5a623]"><Play :size="14" fill="currentColor" /></span>
                  Live demo
                </a>
                <a
                  :href="labHref"
                  class="group inline-flex items-center gap-2 rounded-full border-2 border-[#1c4a3c] px-6 py-3 font-bold text-[#1c4a3c] transition-all duration-300 hover:scale-105 hover:bg-[#1c4a3c] hover:text-white"
                  @click="trackCta({ destination: labHref, label: 'Enter the workspace', placement: 'hero' })"
                >
                  Enter the workspace
                  <ArrowRight :size="18" class="transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="mascot-shell absolute bottom-0 left-[-5%] z-20 w-[330px] max-w-[92vw] sm:left-[7%] sm:w-[430px] lg:left-[10%] lg:w-[470px] xl:left-[14%] xl:w-[520px]">
          <img
            src="/assets/flavoneer-mascot.png"
            alt="Flavoneer's friendly orange one-eyed laboratory mascot"
            class="h-auto w-full select-none"
            width="1402"
            height="1122"
            fetchpriority="high"
          >
          <span class="mascot-eye" aria-hidden="true">
            <span class="mascot-eye-clean" />
            <span class="mascot-original-pupil"><img src="/assets/flavoneer-mascot.png" alt=""></span>
            <span class="mascot-eyelid mascot-eyelid-top" />
            <span class="mascot-eyelid mascot-eyelid-bottom" />
          </span>
        </div>

        <div class="absolute inset-x-0 bottom-0 z-30 flex justify-center">
          <a
            href="#solutions"
            class="flex items-center gap-3 rounded-t-[8px] bg-[#102f27] px-6 py-3 text-xs font-bold uppercase tracking-[0.17em] text-[#d2f2d4] transition-colors hover:text-[#f5a623]"
            @click="trackCta({ destination: '#solutions', label: 'Explore the platform', placement: 'hero_footer' })"
          >
            Explore the platform
            <ArrowRight :size="15" class="rotate-90" />
          </a>
        </div>
      </section>

      <section id="solutions" class="metric-grid relative bg-[#102f27] px-5 py-20 text-white sm:px-8 sm:py-28 lg:px-10">
        <div class="mx-auto max-w-[1280px]">
          <div class="grid gap-8 border-b border-[#d2f2d4]/16 pb-12 lg:grid-cols-[1fr_1.05fr] lg:items-end">
            <div>
              <p class="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#f5a623]">One connected formulation system</p>
              <h2 class="font-display max-w-[700px] text-4xl font-bold leading-[1.05] text-[#effbef] sm:text-5xl lg:text-6xl">
                Turn formulation complexity into clear decisions.
              </h2>
            </div>
            <p class="max-w-[590px] text-base leading-7 text-[#b9d8c7] sm:text-lg sm:leading-8 lg:justify-self-end">
              Flavoneer connects the scientific, regulatory, and commercial details that usually live in separate spreadsheets, so every trial is measurable, traceable, and ready to scale.
            </p>
          </div>

          <div class="mt-10 grid auto-rows-[minmax(230px,auto)] gap-4 lg:grid-cols-12">
            <article class="relative overflow-hidden rounded-[8px] border border-[#386b5b] bg-[#1c4a3c] p-6 sm:p-8 lg:col-span-7 lg:row-span-2">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <span class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#f6bf57]">
                    <FlaskConical :size="17" /> Formula workspace
                  </span>
                  <h3 class="font-display mt-3 max-w-[540px] text-3xl font-bold text-white sm:text-4xl">Develop every trial in one living recipe.</h3>
                </div>
                <span class="grid size-10 shrink-0 place-items-center rounded-full border border-white/20 text-[#d2f2d4]"><ArrowUpRight :size="20" /></span>
              </div>

              <div class="mt-10 overflow-hidden rounded-[8px] border border-[#6a9b85]/35 bg-[#edf8ed] text-[#173e33] shadow-2xl">
                <div class="flex items-center justify-between border-b border-[#bfd8c6] px-4 py-3 sm:px-5">
                  <div>
                    <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-[#658276]">Active formulation</p>
                    <p class="mt-1 font-bold">Cultured Oat Drink · V4</p>
                  </div>
                  <span class="rounded-full bg-[#f6c768] px-3 py-1 text-xs font-bold text-[#5a3b08]">Draft</span>
                </div>
                <div class="grid grid-cols-2 border-b border-[#bfd8c6] sm:grid-cols-4">
                  <div class="border-b border-r border-[#bfd8c6] p-4 sm:border-b-0">
                    <p class="text-[11px] font-semibold text-[#698477]">Batch weight</p>
                    <p class="mt-1 text-xl font-bold">100.0 kg</p>
                  </div>
                  <div class="border-b border-[#bfd8c6] p-4 sm:border-b-0 sm:border-r">
                    <p class="text-[11px] font-semibold text-[#698477]">Batch cost</p>
                    <p class="mt-1 text-xl font-bold">$184.20</p>
                  </div>
                  <div class="border-r border-[#bfd8c6] p-4">
                    <p class="text-[11px] font-semibold text-[#698477]">Cost / serving</p>
                    <p class="mt-1 text-xl font-bold">$0.37</p>
                  </div>
                  <div class="p-4">
                    <p class="text-[11px] font-semibold text-[#698477]">Mass balance</p>
                    <p class="mt-1 flex items-center gap-2 text-xl font-bold"><Check :size="17" class="text-[#228052]" /> 100%</p>
                  </div>
                </div>
                <div class="space-y-2 p-4 sm:p-5">
                  <div v-for="(row, index) in ['Oat base', 'Canola oil', 'Pea protein', 'Mineral blend']" :key="row" class="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-[#d6e7d8] py-2.5 text-sm last:border-0">
                    <span class="font-semibold">{{ row }}</span>
                    <span class="text-[#658276]">{{ [84, 8, 6, 2][index] }}.00 kg</span>
                    <span class="w-14 text-right font-bold">{{ [84, 8, 6, 2][index] }}%</span>
                  </div>
                </div>
              </div>
            </article>

            <article
              v-for="(feature, index) in capabilities"
              :key="feature.title"
              class="group rounded-[8px] border p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7"
              :class="[
                index < 2 ? 'lg:col-span-5' : 'lg:col-span-6',
                {
                  'border-[#88b69c] bg-[#d2f2d4] text-[#173e33]': feature.tone === 'mint',
                  'border-[#d69a27] bg-[#f5a623] text-[#173e33]': feature.tone === 'amber',
                  'border-[#ce5a28] bg-[#ff7738] text-[#2e1a10]': feature.tone === 'orange',
                  'border-[#9bbfb2] bg-[#eef7f1] text-[#173e33]': feature.tone === 'ice',
                },
              ]"
            >
              <div class="flex h-full flex-col">
                <component :is="feature.icon" :size="27" :stroke-width="1.8" />
                <p class="mt-8 text-xs font-bold uppercase tracking-[0.15em] opacity-70">{{ feature.eyebrow }}</p>
                <h3 class="font-display mt-2 text-2xl font-bold leading-tight sm:text-3xl">{{ feature.title }}</h3>
                <p class="mt-3 max-w-[470px] text-sm leading-6 opacity-80 sm:text-base">{{ feature.copy }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="technology" class="bg-[#e9f8ea] px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
        <div class="mx-auto max-w-[1280px]">
          <div class="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div class="lg:sticky lg:top-12">
              <span class="inline-flex items-center gap-2 rounded-full bg-[#1c4a3c] px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#d2f2d4]">
                <Beaker :size="15" /> R&amp;D workflow
              </span>
              <h2 class="font-display mt-6 text-4xl font-bold leading-[1.05] text-[#12382e] sm:text-5xl lg:text-6xl">
                From bench notes to an approved specification.
              </h2>
              <p class="mt-6 max-w-[520px] text-lg leading-8 text-[#557367]">
                Keep technical decisions attached to the formulation they belong to. Every change creates a defensible record without adding administrative work for scientists.
              </p>
              <a
                :href="labHref"
                class="group mt-8 inline-flex items-center gap-2 rounded-full bg-[#f5a623] px-6 py-3.5 font-bold text-[#173e33] transition-all duration-300 hover:scale-105 hover:bg-[#ffb43b]"
                @click="trackCta({ destination: labHref, label: 'Start a formulation', placement: 'technology' })"
              >
                Start a formulation <ArrowRight :size="18" class="transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div class="border-t border-[#95b9a3]">
              <article v-for="step in workflowSteps" :key="step.number" class="grid gap-4 border-b border-[#95b9a3] py-8 sm:grid-cols-[84px_160px_1fr] sm:items-start sm:gap-6">
                <span class="font-display text-3xl font-bold text-[#f08232]">{{ step.number }}</span>
                <h3 class="font-display text-2xl font-bold text-[#173e33]">{{ step.title }}</h3>
                <p class="max-w-[500px] leading-7 text-[#557367]">{{ step.copy }}</p>
              </article>

              <div class="mt-8 grid gap-3 sm:grid-cols-3">
                <div class="rounded-[8px] border border-[#b8d2bf] bg-white/70 p-5">
                  <Gauge :size="22" class="text-[#e5792e]" />
                  <p class="font-display mt-8 text-4xl font-bold text-[#173e33]">100%</p>
                  <p class="mt-1 text-sm font-semibold text-[#658276]">Mass balance visibility</p>
                </div>
                <div class="rounded-[8px] border border-[#b8d2bf] bg-white/70 p-5">
                  <ShieldCheck :size="22" class="text-[#e5792e]" />
                  <p class="font-display mt-8 text-4xl font-bold text-[#173e33]">2</p>
                  <p class="mt-1 text-sm font-semibold text-[#658276]">FDA + EU label modes</p>
                </div>
                <div class="rounded-[8px] border border-[#b8d2bf] bg-white/70 p-5">
                  <Network :size="22" class="text-[#e5792e]" />
                  <p class="font-display mt-8 text-4xl font-bold text-[#173e33]">Live</p>
                  <p class="mt-1 text-sm font-semibold text-[#658276]">Ingredient data sync</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-[#f5a623] px-5 py-20 text-[#173e33] sm:px-8 sm:py-24 lg:px-10">
        <div class="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p class="text-sm font-bold uppercase tracking-[0.18em]">Built for serious product development</p>
            <h2 class="font-display mt-4 max-w-[900px] text-4xl font-bold leading-[1.03] sm:text-5xl lg:text-6xl">
              Formulate faster. Release with confidence.
            </h2>
            <p class="mt-5 max-w-[700px] text-lg leading-8 text-[#36594e]">
              Give product developers, quality organizations, and operations one shared record from first concept through commercial production.
            </p>
          </div>
          <a
            :href="labHref"
            class="group inline-flex w-fit items-center gap-3 rounded-full bg-[#173e33] px-7 py-4 font-bold text-white transition-all duration-300 hover:scale-105 hover:bg-[#102f27]"
            @click="trackCta({ destination: labHref, label: 'Open Flavoneer', placement: 'closing_banner' })"
          >
            Open Flavoneer
            <ArrowUpRight :size="19" class="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>
    </main>

    <footer class="bg-[#102f27] px-5 py-10 text-[#b9d8c7] sm:px-8 lg:px-10">
      <div class="mx-auto flex max-w-[1280px] flex-col gap-6 border-b border-[#d2f2d4]/12 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="#top"
          class="font-display text-3xl font-bold text-[#f5a623]"
          @click="trackNavigation({ destination: '#top', label: 'Home', placement: 'footer_logo' })"
        >
          flavoneer
        </a>
        <div class="flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold">
          <a
            href="#solutions"
            class="transition-colors hover:text-white"
            @click="trackNavigation({ destination: '#solutions', label: 'Solutions', placement: 'footer' })"
          >
            Solutions
          </a>
          <a
            href="#technology"
            class="transition-colors hover:text-white"
            @click="trackNavigation({ destination: '#technology', label: 'Technology', placement: 'footer' })"
          >
            Technology
          </a>
          <a
            :href="`${labHref}/login`"
            class="transition-colors hover:text-white"
            @click="trackCta({ destination: `${labHref}/login`, label: 'Log in', placement: 'footer' })"
          >
            Log in
          </a>
        </div>
      </div>
      <div class="mx-auto flex max-w-[1280px] flex-col gap-2 pt-6 text-xs text-[#7fa495] sm:flex-row sm:justify-between">
        <p>© {{ new Date().getFullYear() }} Flavoneer. Food innovation, structured.</p>
        <p>Formulation · Compliance · Costing · Scale-up</p>
      </div>
    </footer>
  </div>
</template>
