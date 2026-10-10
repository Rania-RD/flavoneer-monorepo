import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { authClient, convexUrl } from "./lib/backend";
import { I18nProvider } from "./lib/i18n";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root mount element");
}

const convex = new ConvexReactClient(convexUrl);

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ConvexBetterAuthProvider authClient={authClient} client={convex}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ConvexBetterAuthProvider>
  </React.StrictMode>,
);
