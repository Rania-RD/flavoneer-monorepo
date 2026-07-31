# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/landing/package.json apps/landing/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY rd/formulation-lab/package.json rd/formulation-lab/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @flavoneer/formulation-lab...

COPY rd/formulation-lab rd/formulation-lab

RUN pnpm --filter @flavoneer/formulation-lab build

FROM nginx:1.29-alpine AS runtime

COPY rd/formulation-lab/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY rd/formulation-lab/docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /workspace/rd/formulation-lab/dist /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
