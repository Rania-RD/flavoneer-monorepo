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

The shared backend in `packages/backend` reads these Convex environment values:

```sh
CONVEX_SITE_URL=
BETTER_AUTH_URL=
SITE_URL=http://localhost:3000
MOBILE_SITE_URL=flavoneer://
INVITATION_EMAIL_WEBHOOK_URL=
INVITATION_EMAIL_WEBHOOK_SECRET=
```

Set `BETTER_AUTH_URL` to the deployment HTTP Actions origin ending in
`.convex.site`. This explicit value is also available while Better Auth builds
its local component adapter, where Convex built-in environment variables may
not be exposed.

`INVITATION_EMAIL_WEBHOOK_URL` is optional. When set, Better Auth posts a
`workspace.invitation.created` JSON payload containing the recipient, inviter,
organization, and acceptance URL. `INVITATION_EMAIL_WEBHOOK_SECRET` is sent as
a Bearer token when configured.

## Better Auth workspace migration

Better Auth organizations own workspace membership, invitations, and the
coarse `owner`, `admin`, and `member` roles. The local `teams`, `teamMembers`,
and `teamInvites` tables remain bounded read projections because formulation
records still reference Convex team IDs. Product permissions remain in the
local role system.

Deploy the widened schema before starting the backfill. Run a dry run against
the intended deployment, inspect the output, then start the resumable runner:

```sh
pnpm --filter @flavoneer/backend exec convex dev --once
pnpm --filter @flavoneer/backend exec convex run migrations:attachBetterAuthOrganizations '{"dryRun":true}'
pnpm --filter @flavoneer/backend exec convex run migrations:run '{"fn":"migrations:attachBetterAuthOrganizations"}'
```

The migration reuses matching organization and member records, assigns new
Better Auth IDs to pending legacy invitations, and preserves the Convex team
IDs referenced by domain data. It does not send replacement emails for legacy
invitations; workspace admins should copy the new acceptance links from the
Invitations tab. Do not run with `--prod` until `workspaceMigration:inventory`
has been reviewed with an authenticated administrator identity and workspace
deletion-retention policy has been confirmed.

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
- Update `packages/backend/convex/schema.ts` when table fields or indexes change.
- Update `types.ts` when frontend-facing data shapes change.
- Check all calling code when changing Convex args. Convex rejects extra and missing fields.
- Use `t("key")` for new UI strings.
- Support dark mode and RTL-aware layout.
- Prefer CSS logical properties such as `start`, `end`, `ps`, and `pe`.


`pnpm clear:tables` runs `clearAllAppTables:run` through the shared backend workspace; use it only when intentionally clearing local app data.
