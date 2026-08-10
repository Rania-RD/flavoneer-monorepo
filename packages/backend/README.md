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

The formulation lab and mobile app must point to the deployment selected by
`CONVEX_DEPLOYMENT`:

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
