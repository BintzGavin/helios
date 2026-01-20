import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@helios/core": resolve(__dirname, "packages/core/src/index.ts"),
    },
  },
  server: {
    open: true, // Automatically open the app in the browser
  },
});
