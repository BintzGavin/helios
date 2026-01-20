import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  // Root of the project
  root: ".",
  base: "./",
  build: {
    outDir: "output/example-build",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        simple_canvas: resolve(__dirname, "examples/simple-canvas-animation/composition.html"),
        react_canvas: resolve(__dirname, "examples/react-canvas-animation/composition.html"),
      },
    },
  },
});
