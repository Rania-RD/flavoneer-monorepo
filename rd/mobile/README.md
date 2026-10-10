# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Over-the-air updates (xprem)

The native app receives JavaScript updates through `expo-updates` from the
self-hosted [xprem](https://xprem.dev) server at `https://ota.synbiodiet.com`.
The Flavoneer app on that server has the App ID
`036ee8e3-ad1e-4f97-ba65-f431ee63767d`. Updates are signed by the server and
verified against `certs/certificate.pem`.

Each native build is bound to a release channel taken from `APP_VARIANT`:
`development`, `preview`, or `production` (the default). The runtime version
uses the `appVersion` policy, so an update only reaches builds with the same
`version` in `app.config.ts`. Bump `version` whenever native code changes.

Server URL, certificate, channel, and runtime version are embedded at build
time. Builds made before this setup still poll the Convex Hot Updater endpoint
and need a new native build to receive xprem updates.

Create the publish token file:

```bash
cp rd/mobile/.env.xprem.example rd/mobile/.env.xprem
```

Set `EOO_TOKEN` to an API key from the Flavoneer app in the
[xprem dashboard](https://ota.synbiodiet.com/dashboard). Without it, `eoas`
falls back to Expo authentication and the server rejects the publish.

Publish from a clean git tree:

```bash
pnpm --filter mobile ota:publish --branch production -m "Describe the change"
```

In the dashboard, the `production` channel must point at the `production`
branch. Use `--rollout-percentage` for a progressive rollout.

New updates download on launch and apply on the next cold start. Updates are
not applied in Expo Go or a development build; use a release build on a
physical device for end-to-end testing. Set `DISABLE_CODE_SIGNING=true` when
a local tool needs the config without the signing certificate.

## Bugsink

The app reports JavaScript and native errors to the Bugsink project at
`zapper.synbiodiet.com`. Performance tracing and session tracking are disabled
because Bugsink only processes error events. Default PII collection is also
disabled.

EAS Build uploads Metro source maps through `sentry-cli`. The non-secret
`SENTRY_PROJECT=flavoneer-web` value is configured in the Expo plugin and in
the linked EAS project. Create this variable in every EAS environment used by a
build profile:

- `SENTRY_AUTH_TOKEN`: a Bugsink API token, stored with sensitive visibility.

The build profiles load the matching `development`, `preview`, or `production`
EAS environment. Run `eas env:create --environment production` once for each
variable and repeat for any other build environment in use. The Bugsink URL,
project slug, and single-organization value are committed in the Expo config;
the auth token must not be committed or prefixed with `EXPO_PUBLIC_`.

The Metro config injects matching debug IDs into bundles and source maps. The
Sentry Expo config plugin adds the native EAS Build upload steps for Android and
iOS. A missing or incorrect `SENTRY_PROJECT` or `SENTRY_AUTH_TOKEN` makes the
upload fail instead of silently producing unsymbolicated errors.

## Shared Convex backend

The mobile app uses the same Convex project, generated API, and Better Auth
identity source as the formulation lab. Configure the mobile client with the
matching deployment URLs:

```env
EXPO_PUBLIC_CONVEX_URL=
EXPO_PUBLIC_CONVEX_SITE_URL=
```

The Convex schema and functions live in `packages/backend/convex`. Run the
backend development loop from the repository root:

```sh
pnpm dev:backend
```

The active organization is selected from user settings. The app persists the
matching organization ID in SecureStore and uses it for production queries after the
user returns to the production screen.

Appearance is also a per-user Convex setting shared with the formulation lab.
`ThemePreferenceProvider` supports Light, Dark, and System. System follows the
device color scheme, while an explicit choice updates NativeWind, Expo Router,
and the status bar together.

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).