# Shared Convex backend

This package owns the Convex schema, functions, authentication, and generated
API used by the formulation lab and mobile app.

## Development

Configure the existing Convex project from this package, then run the backend
development loop:

```sh
cp packages/backend/.env.example packages/backend/.env.local
pnpm --filter @flavoneer/backend dev
```

Set `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY` in the backend
env file. Do not set `CONVEX_DEPLOYMENT` for a self-hosted deployment.

The formulation lab and mobile app must point to the matching backend and site
URLs:

```sh
# rd/formulation-lab/.env.local
VITE_CONVEX_URL=
VITE_CONVEX_SITE_URL=

# rd/mobile/.env.local
EXPO_PUBLIC_CONVEX_URL=
EXPO_PUBLIC_CONVEX_SITE_URL=
```

Run Convex CLI commands from this workspace package so code generation and
deployment always use `packages/backend/convex`.

The deploy script uses the standard Convex env lookup, so production automation
can provide `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY` as shell
or CI environment variables:

```sh
pnpm --filter @flavoneer/backend deploy
```

For staging, copy the staging environment example, add the admin key, and run
the root deployment command:

```sh
cp packages/backend/.env.staging.example packages/backend/.env.staging
pnpm deploy:staging
```

The staging command passes `packages/backend/.env.staging` to the Convex CLI
explicitly, so values from the development environment cannot select the target.
