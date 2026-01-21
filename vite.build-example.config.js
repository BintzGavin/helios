import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Root of the project
  root: ".",
  base: "./",
  build: {
    outDir: "output/example-build",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        composition: resolve(__dirname, "examples/simple-canvas-animation/composition.html"),
        react_composition: resolve(__dirname, "examples/react-canvas-animation/composition.html"),
      },
    },
  },
});
