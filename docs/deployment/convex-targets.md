# Convex deployment targets

The monorepo uses a Convex Cloud deployment for development and a self-hosted
deployment for production. Never place the production admin key in a tracked
file or in an `EXPO_PUBLIC_*`/`VITE_*` variable.

| Environment | Backend | HTTP actions/site | Dashboard |
| --- | --- | --- | --- |
| Cloud development | `https://rare-toad-730.convex.cloud` | `https://rare-toad-730.convex.site` | Convex Cloud dashboard |
| Self-hosted production | `https://backend.prod.convex.flavoneer.com` | `https://site.prod.convex.flavoneer.com` | `https://dashboard.prod.convex.flavoneer.com` |

## Local files

- `rd/mobile/.env` selects cloud development for Expo and is gitignored.
- `packages/backend/.env.production.local` selects self-hosted production for
  the Convex CLI and is gitignored because it contains the admin key.
- The tracked `*.env.example` files document public values and leave secret
  values empty.

Validate all tracked mappings and any local files that are present:

```sh
pnpm validate:convex-targets
```

Require both ignored local files and validate the deploy credential format:

```sh
pnpm validate:convex-targets:local
```

## Deploying the backend

Always inspect a dry run before pushing to the self-hosted production instance:

```sh
pnpm --filter @flavoneer/backend deploy:self-hosted:dry-run
pnpm --filter @flavoneer/backend deploy:self-hosted
```

The deploy scripts pass `--env-file .env.production.local`, which makes the
target explicit and prevents the cloud development selection in `.env.local`
from being used accidentally.

The deployment itself must also define `CONVEX_SITE_URL` and
`BETTER_AUTH_URL` as `https://site.prod.convex.flavoneer.com/` in the
self-hosted dashboard. These are Convex function environment variables; values
in the local CLI file select the target but are not uploaded automatically.

The infrastructure hosting Convex must map `CONVEX_CLOUD_ORIGIN` and
`NEXT_PUBLIC_DEPLOYMENT_URL` to the production backend origin, and
`CONVEX_SITE_ORIGIN` to the production site origin. Those service-level values
belong in the self-hosted Convex stack rather than this application repository.
