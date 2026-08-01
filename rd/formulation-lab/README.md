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


`npm run clear:tables` calls `npx convex run clearAllAppTables:run`; use it only when intentionally clearing local app data.
