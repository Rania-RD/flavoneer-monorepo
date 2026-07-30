import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { authClient } from "./lib/auth-client";
import "./lib/i18n";
import "@glideapps/glide-data-grid/dist/index.css";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

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
