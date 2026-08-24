import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: "../../rd/formulation-lab",
  plugins: [react()],
});
