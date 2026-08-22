import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./lib/i18n";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root mount element");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
