# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

Copy `.env.example` to `.env` and configure the landing page:

```bash
NUXT_PUBLIC_LAB_URL=http://localhost:3001
VITE_PUBLIC_POSTHOG_KEY=phc_your_project_key
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

`VITE_PUBLIC_POSTHOG_KEY` is the public project key from PostHog. Use
`https://eu.i.posthog.com` for an EU-hosted project. When the key is omitted or
blank, the analytics client becomes a no-op and the landing page continues to
work normally. All events from this client include `app_surface=landing`.

### Coolify

Add these variables to the landing page resource:

```env
VITE_PUBLIC_POSTHOG_KEY=phc_SHARED_PROJECT_TOKEN
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Enable **Build Variable** for both values and redeploy the resource. Vite public
variables are compiled into the client bundle during the image build, so adding
them only at container runtime is too late. Runtime Variable may remain enabled.
Use `https://eu.i.posthog.com` instead when the PostHog project is hosted in the
EU. Use the same project token for the landing and formulation-lab resources;
the `app_surface` event property separates their traffic.

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
