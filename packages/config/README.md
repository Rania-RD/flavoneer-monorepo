# Shared environment configuration

`@flavoneer/config` validates environment values and maps framework-specific
names to stable application properties. Import the entry point for the current
runtime only:

- `@flavoneer/config/env/landing` for Nuxt public values.
- `@flavoneer/config/env/formulation-lab` for Vite public values.
- `@flavoneer/config/env/mobile` for Expo public values.
- `@flavoneer/config/env/server` for Convex functions and Node tooling.

Client entry points contain only public variables. Do not import
`@flavoneer/config/env/server` from application code that Vite, Nuxt, or Metro
can place in a client bundle.

Expo variables must be read with direct dot notation in the mobile app and then
passed to `createMobileEnv`. Metro does not inline dynamic property access or
environment reads inside packages.

## Variable ownership

| Runtime | Public variables | Sensitive or server-only variables |
| --- | --- | --- |
| Landing | `NUXT_PUBLIC_LAB_URL`, `VITE_PUBLIC_POSTHOG_HOST`, `VITE_PUBLIC_POSTHOG_KEY` | None |
| Formulation lab | `VITE_CONVEX_SITE_URL`, `VITE_CONVEX_URL`, `VITE_PUBLIC_POSTHOG_HOST`, `VITE_PUBLIC_POSTHOG_KEY`, `VITE_SITE_URL` | `FOODWATCH_DATABASE_URL`, `REGULATORY_IMPORT_TOKEN` |
| Mobile app | `EXPO_PUBLIC_CONVEX_SITE_URL`, `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_HOT_UPDATER_URL` | `SENTRY_AUTH_TOKEN` |
| Hot Updater deploy | None | `HOT_UPDATER_API_TOKEN`, `HOT_UPDATER_SERVER_URL`, `HOT_UPDATER_S3_ACCESS_KEY_ID`, `HOT_UPDATER_S3_BASE_PATH`, `HOT_UPDATER_S3_BUCKET`, `HOT_UPDATER_S3_ENDPOINT`, `HOT_UPDATER_S3_REGION`, `HOT_UPDATER_S3_SECRET_ACCESS_KEY` |
| Convex backend | None | `BETTER_AUTH_URL`, `CONVEX_SITE_URL`, `INVITATION_EMAIL_WEBHOOK_SECRET`, `INVITATION_EMAIL_WEBHOOK_URL`, `MOBILE_SITE_URL`, `REGULATORY_IMPORT_TOKEN`, `SITE_URL`, and the Hot Updater server variables above |
| Playwright | None | `CI`, `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_SKIP_WEB_SERVER` |

`CONVEX_DEPLOYMENT` is owned by the Convex CLI rather than application code.
Keep actual secret values in ignored local files, Convex deployment variables,
or the deployment platform's secret store. Committed `.env.example` files must
contain empty values or safe local defaults only.
