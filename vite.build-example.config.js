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
        react_dom: resolve(__dirname, "examples/react-dom-animation/composition.html"),
        vue_composition: resolve(__dirname, "examples/vue-canvas-animation/composition.html"),
        vue_dom: resolve(__dirname, "examples/vue-dom-animation/composition.html"),
        svelte_composition: resolve(__dirname, "examples/svelte-canvas-animation/composition.html"),
        svelte_dom: resolve(__dirname, "examples/svelte-dom-animation/composition.html"),
        threejs_composition: resolve(__dirname, "examples/threejs-canvas-animation/composition.html"),
        pixi_composition: resolve(__dirname, "examples/pixi-canvas-animation/composition.html"),
        animation_helpers: resolve(__dirname, "examples/animation-helpers/composition.html"),
        react_helpers: resolve(__dirname, "examples/react-animation-helpers/composition.html"),
        svelte_helpers: resolve(__dirname, "examples/svelte-animation-helpers/composition.html"),
        vue_helpers: resolve(__dirname, "examples/vue-animation-helpers/composition.html"),
        gsap_animation: resolve(__dirname, "examples/gsap-animation/composition.html"),
        framer_motion: resolve(__dirname, "examples/framer-motion-animation/composition.html"),
      },
    },
  },
});
