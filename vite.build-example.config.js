import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [react(), vue(), svelte()],
  // Root of the project
  root: ".",
  base: "./",
  build: {
    outDir: "output/example-build",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        simple_dom: resolve(__dirname, "examples/simple-animation/composition.html"),
        simple_canvas: resolve(__dirname, "examples/simple-canvas-animation/composition.html"),
        react_composition: resolve(__dirname, "examples/react-canvas-animation/composition.html"),
        vue_composition: resolve(__dirname, "examples/vue-canvas-animation/composition.html"),
        svelte_composition: resolve(__dirname, "examples/svelte-canvas-animation/composition.html"),
        threejs_composition: resolve(__dirname, "examples/threejs-canvas-animation/composition.html"),
        animation_helpers: resolve(__dirname, "examples/animation-helpers/composition.html"),
      },
    },
  },
});
