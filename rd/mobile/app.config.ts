import type { ExpoConfig } from "expo/config";

const isDevelopment = process.env.APP_VARIANT === "development";
// xprem release channel baked into each native build.
const updatesChannel =
  process.env.APP_VARIANT === "development" ||
  process.env.APP_VARIANT === "preview"
    ? process.env.APP_VARIANT
    : "production";

const config: ExpoConfig = {
  name: isDevelopment ? "Flavoneer (Dev)" : "Flavoneer",
  slug: "flavoneer",
  version: "0.1.0",
  platforms: ["ios", "android"],
  orientation: "portrait",
  icon: isDevelopment
    ? "./assets/images/icon-development.png"
    : "./assets/images/icon.png",
  locales: {
    en: "./src/locales/native-en.json",
    ar: "./src/locales/native-ar.json",
  },
  scheme: "flavoneer",
  userInterfaceStyle: "automatic",
  ios: {
    icon: isDevelopment
      ? "./assets/images/icon-development.png"
      : "./assets/expo.icon",
    bundleIdentifier: isDevelopment
      ? "com.flavoneer.mobile.dev"
      : "com.flavoneer.mobile",
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
      ITSAppUsesNonExemptEncryption: false,
      ExpoLocalization_supportsRTL: true,
      CFBundleLocalizations: ["en", "ar"],
    },
  },
  android: {
    adaptiveIcon: isDevelopment
      ? {
          backgroundColor: "#3210A8",
          foregroundImage: "./assets/images/android-icon-foreground.png",
          monochromeImage: "./assets/images/android-icon-monochrome.png",
        }
      : {
          backgroundColor: "#D2F2D4",
          foregroundImage: "./assets/images/android-icon-foreground.png",
          backgroundImage: "./assets/images/android-icon-background.png",
          monochromeImage: "./assets/images/android-icon-monochrome.png",
        },
    predictiveBackGestureEnabled: false,
    package: isDevelopment
      ? "com.flavoneer.mobile.dev"
      : "com.flavoneer.mobile",
    permissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.CAMERA",
    ],
  },
  plugins: [
    "expo-router",
    [
      "@sentry/react-native/expo",
      {
        organization: "bugsinkhasnoorgs",
        project: "flavoneer-web",
        url: "https://zapper.synbiodiet.com/",
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#D2F2D4",
        image: "./assets/images/splash-icon.png",
        imageWidth: 192,
      },
    ],
    "expo-secure-store",
    "expo-image",
    "expo-notifications",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Flavoneer to select production record photos from your library.",
      },
    ],
    [
      "expo-localization",
      {
        supportedLocales: {
          ios: ["en", "ar"],
          android: ["en", "ar"],
        },
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "Allow Flavoneer to photograph printed production carton labels.",
        recordAudioAndroid: false,
        barcodeScannerEnabled: false,
      },
    ],
    "expo-sqlite",
    "expo-background-task",
    "expo-sharing",
    "expo-screen-orientation",
    [
      "expo-local-authentication",
      {
        faceIDPermission:
          "Allow Flavoneer to use Face ID to confirm quality approvals.",
      },
    ],
    [
      "react-native-nfc-manager",
      {
        nfcPermission:
          "Allow Flavoneer to read NFC tags on production equipment.",
        includeNdefEntitlement: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    enabled: true,
    url: "https://ota.synbiodiet.com/manifest",
    // DISABLE_CODE_SIGNING=true lets `expo start` run without the private key.
    codeSigningCertificate: process.env.DISABLE_CODE_SIGNING
      ? undefined
      : "./certs/certificate.pem",
    codeSigningMetadata: process.env.DISABLE_CODE_SIGNING
      ? undefined
      : { keyid: "main", alg: "rsa-v1_5-sha256" },
    // expo-updates only sends headers that exist at build time. Keep the
    // channel a literal: an unset variable would drop the header.
    requestHeaders: {
      "expo-channel-name": updatesChannel,
      "expo-app-id": "036ee8e3-ad1e-4f97-ba65-f431ee63767d",
      "xprem-branch": "",
    },
  },
  extra: {
    supportsRTL: true,
    router: {},
    eas: {
      projectId: "4a5c7d7e-343c-461d-b17f-d726fb00b49e",
    },
  },
};

export default config;
