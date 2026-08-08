import type { ExpoConfig } from "expo/config";

const isDevelopment = process.env.APP_VARIANT === "development";

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
    [
      "@hot-updater/react-native",
      {
        channel: "production",
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
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  updates: {
    enabled: false,
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
