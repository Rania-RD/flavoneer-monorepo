import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  preview: {
    allowedHosts: ["lab.flavoneer.com"],
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
