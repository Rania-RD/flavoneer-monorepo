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

## Hot Updater

The native app uses Hot Updater with the `appVersion` strategy and the
`production` channel by default. Expo updates are disabled so that only Hot
Updater controls over-the-air JavaScript updates.

Create the local runtime and deploy configuration:

```bash
cp rd/mobile/.env.example rd/mobile/.env.local
cp rd/mobile/.env.hotupdater.example rd/mobile/.env.hotupdater
```

`EXPO_PUBLIC_HOT_UPDATER_URL` and `HOT_UPDATER_SERVER_URL` must point to the
same self-hosted Hot Updater base path. The server must expose the standard
check-update and bundle API routes and use the same S3 storage settings as
`hot-updater.config.ts`.

The deploy process reads AWS credentials from the standard AWS credential
chain. It also accepts `HOT_UPDATER_S3_ACCESS_KEY_ID` and
`HOT_UPDATER_S3_SECRET_ACCESS_KEY`. Set `HOT_UPDATER_S3_ENDPOINT` for an
S3-compatible service and `HOT_UPDATER_API_TOKEN` when the bundle API uses
Bearer authentication.

Build a new native binary after adding or changing Hot Updater native
configuration:

```bash
pnpm --filter mobile exec expo prebuild
```

Deploy JavaScript-only changes interactively:

```bash
pnpm --filter mobile deploy
```

Hot Updater is disabled in the JavaScript root when
`EXPO_PUBLIC_HOT_UPDATER_URL` is absent. It does not apply updates in Expo Go
or a development build; use an iOS or Android release build for end-to-end
testing.

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

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial for building Android and iOS apps.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
