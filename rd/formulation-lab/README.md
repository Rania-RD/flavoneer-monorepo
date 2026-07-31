# Food R&D Lab Manager

Food R&D Lab Manager is a Vite, React, TypeScript, and Convex app for food product formulation work. It tracks projects, recipe phases, manufacturing runs, inventory, lab reports, sensory tests, team membership, roles, and audit-facing activity.

## Quick Start

Prerequisites:

- Node.js
- npm
- A Convex dev deployment

Install dependencies:

```sh
npm install
```

Run the frontend:

```sh
npm run dev
```

Run the Convex backend in a second terminal:

```sh
npx convex dev
```

The web UI runs at `http://localhost:3000`.

## Local Auth

The app uses Better Auth through `@convex-dev/better-auth`. Email/password auth is enabled without email verification in local development.

Test account used by Playwright:

- Email: `test@example.com`
- Password: `test1234`

If the account does not exist, the manufacturing flow test signs up with that email and password before continuing.

## Environment

The frontend needs Convex URLs from the local Convex deployment:

```sh
VITE_CONVEX_URL=
VITE_CONVEX_SITE_URL=
```

PostHog browser analytics uses these public variables:

```sh
VITE_PUBLIC_POSTHOG_KEY=
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

When `VITE_PUBLIC_POSTHOG_KEY` is omitted or blank, analytics initialization is
skipped and the lab continues to run normally. Use
`https://eu.i.posthog.com` for a PostHog EU Cloud project. All events from this
client include `app_surface=formulation_lab`.

The backend auth code reads these Convex environment values:

```sh
CONVEX_SITE_URL=
SITE_URL=http://localhost:3000
```

`GEMINI_API_KEY` is still wired in `vite.config.ts`, but the current app shell is not the generic AI Studio starter described by the old README.

### Coolify

Add these variables to the formulation-lab resource:

```env
VITE_PUBLIC_POSTHOG_KEY=phc_SHARED_PROJECT_TOKEN
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

The production container creates `/runtime-config.js` when it starts, so these
variables only need to be enabled as runtime variables in Coolify. They no
longer need to be sent to the image build. Use the same project token for the
landing and formulation-lab resources; filter or break down events by
`app_surface` when analyzing their shared user journey.

### Free GHCR deployment

The formulation lab image is built on GitHub-hosted Actions and published as:

```text
ghcr.io/rania-rd/flavoneer-formulation-lab:latest
```

The workflow runs after relevant changes reach `main`, and can also be started
manually from the Actions tab. It publishes an immutable `sha-...` tag alongside
`latest`.

Configure the Coolify resource as a Docker image deployment using the image
above and port `80`. Keep the existing `VITE_CONVEX_URL`,
`VITE_CONVEX_SITE_URL`, `VITE_SITE_URL`, `VITE_PUBLIC_POSTHOG_KEY`, and
`VITE_PUBLIC_POSTHOG_HOST` runtime variables on the resource. This makes Coolify
pull and start a prebuilt image instead of installing packages on the server.

For the existing Git-backed Coolify resource, select the `Dockerfile` build
pack and set the Dockerfile location to `/Dockerfile.coolify` while keeping the
base directory `/rd/formulation-lab`. The wrapper contains only a `FROM` line,
so the server pulls the completed GHCR image instead of rebuilding the app.

Automatic deployment uses Coolify's signed manual GitHub webhook and requires
no Coolify API token. Keep **Auto Deploy** enabled for the resource and add the
GitHub webhook URL and secret shown on the resource's **Webhooks** page to the
repository's **Settings > Webhooks** page.

After GHCR publishing succeeds, the workflow updates
`.coolify/formulation-lab-release` with the source commit and pushes a
`[skip ci]` deploy-signal commit. That push is outside the workflow's watched
paths, so it cannot start another image build; it only causes Coolify to pull
the already-published `latest` image through `Dockerfile.coolify`.

## Architecture

Frontend:

- `App.tsx` defines authenticated routes and public evaluation links.
- `pages/` contains route-level screens: dashboard, formulation, runs, materials, reports, team, and settings.
- `components/` contains shared UI and feature components.
- `context/SettingsContext.tsx` owns localization, theme, and RTL settings.
- `context/TeamContext.tsx` owns active team state.
- `lib/auth-client.ts` configures the Better Auth client against the Convex site URL.

Backend:

- `convex/schema.ts` defines tables, validators, and indexes.
- `convex/*.ts` files expose Convex queries, mutations, actions, and HTTP handlers.
- `convex/auth.ts` configures Better Auth and exposes the current auth user query.
- `convex/app.config.ts` installs the Better Auth Convex component.
- `convex/BACKEND.md` documents backend patterns for enrichment, snapshots, and query performance.

Shared contracts:

- `types.ts` contains frontend-facing domain types.
- `convex/validators.ts` contains reusable Convex validators.
- `locales/en.json` and `locales/ar.json` contain UI copy. New UI text should use translation keys.

## Current Routes

- `/` dashboard
- `/project/:id` formulation editor
- `/runs` run list
- `/run/:id` run detail
- `/materials` inventory and ingredient library
- `/reports` report list
- `/reports/:id` report detail
- `/team` team management
- `/settings` app settings
- `/evaluate/:token` public sensory evaluation
- `/share/:token` authenticated share target

## Quality Gates

Run these before handoff when the change is not docs-only:

```sh
npm run check
npm run build
npm test
```

`npm run check` runs Ultracite with diagnostics set to errors. `npm test` runs Playwright against `http://localhost:3000`; the config reuses an existing dev server outside CI.

For docs-only changes, a targeted markdown/content review is usually enough unless the docs describe changed runtime behavior.

## Project Rules

- Keep Convex `args` validators and handlers in sync.
- Update `convex/schema.ts` when table fields or indexes change.
- Update `types.ts` when frontend-facing data shapes change.
- Check all calling code when changing Convex args. Convex rejects extra and missing fields.
- Use `t("key")` for new UI strings.
- Support dark mode and RTL-aware layout.
- Prefer CSS logical properties such as `start`, `end`, `ps`, and `pe`.

## Useful Commands

```sh
npm run dev
npx convex dev
npm run build
npm run check
npm run fix
npm test
npm run import:foodwatch-regulatory
npm run clear:tables
```

`npm run clear:tables` calls `npx convex run clearAllAppTables:run`; use it only when intentionally clearing local app data.
