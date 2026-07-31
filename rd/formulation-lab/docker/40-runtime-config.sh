#!/bin/sh
set -eu

template="/usr/share/nginx/html/runtime-config.template.js"
output="/usr/share/nginx/html/runtime-config.js"

envsubst \
  '${VITE_CONVEX_URL} ${VITE_CONVEX_SITE_URL} ${VITE_SITE_URL} ${VITE_PUBLIC_POSTHOG_KEY} ${VITE_PUBLIC_POSTHOG_HOST}' \
  < "$template" > "$output"

rm "$template"
