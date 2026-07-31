import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeAnalytics } from "./lib/analytics";
import { authClient } from "./lib/auth-client";
import "./lib/i18n";
import { publicConfig } from "./lib/runtime-config";
import "@glideapps/glide-data-grid/dist/index.css";
import "./index.css";

if (!publicConfig.convexUrl) {
  throw new Error(
    "VITE_CONVEX_URL is required. Set it at runtime or during the Vite build."
  );
}

const convex = new ConvexReactClient(publicConfig.convexUrl);

initializeAnalytics();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ConvexBetterAuthProvider authClient={authClient} client={convex}>
      <App />
    </ConvexBetterAuthProvider>
  </React.StrictMode>
);
