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
        react_css: resolve(__dirname, "examples/react-css-animation/composition.html"),
        vue_composition: resolve(__dirname, "examples/vue-canvas-animation/composition.html"),
        vue_dom: resolve(__dirname, "examples/vue-dom-animation/composition.html"),
        svelte_composition: resolve(__dirname, "examples/svelte-canvas-animation/composition.html"),
        svelte_dom: resolve(__dirname, "examples/svelte-dom-animation/composition.html"),
        threejs_composition: resolve(__dirname, "examples/threejs-canvas-animation/composition.html"),
        pixi_composition: resolve(__dirname, "examples/pixi-canvas-animation/composition.html"),
        p5_composition: resolve(__dirname, "examples/p5-canvas-animation/composition.html"),
        animation_helpers: resolve(__dirname, "examples/animation-helpers/composition.html"),
        react_helpers: resolve(__dirname, "examples/react-animation-helpers/composition.html"),
        svelte_helpers: resolve(__dirname, "examples/svelte-animation-helpers/composition.html"),
        vue_helpers: resolve(__dirname, "examples/vue-animation-helpers/composition.html"),
        gsap_animation: resolve(__dirname, "examples/gsap-animation/composition.html"),
        framer_motion: resolve(__dirname, "examples/framer-motion-animation/composition.html"),
        lottie_animation: resolve(__dirname, "examples/lottie-animation/composition.html"),
        motion_one: resolve(__dirname, "examples/motion-one-animation/composition.html"),
        captions_animation: resolve(__dirname, "examples/captions-animation/composition.html"),
        signals_animation: resolve(__dirname, "examples/signals-animation/composition.html"),
        dynamic_props: resolve(__dirname, "examples/dynamic-props-animation/composition.html"),
        media_element: resolve(__dirname, "examples/media-element-animation/composition.html"),
        d3_animation: resolve(__dirname, "examples/d3-animation/composition.html"),
        tailwind_animation: resolve(__dirname, "examples/tailwind-animation/composition.html"),
        waapi_animation: resolve(__dirname, "examples/waapi-animation/composition.html"),
        audio_visualization: resolve(__dirname, "examples/audio-visualization/composition.html"),
        procedural_generation: resolve(__dirname, "examples/procedural-generation/composition.html"),
        chartjs_animation: resolve(__dirname, "examples/chartjs-animation/composition.html"),
        social_media_story: resolve(__dirname, "examples/social-media-story/composition.html"),
        react_transitions: resolve(__dirname, "examples/react-transitions/composition.html"),
        react_three_fiber: resolve(__dirname, "examples/react-three-fiber/composition.html"),
        svelte_transitions: resolve(__dirname, "examples/svelte-transitions/composition.html"),
        vue_transitions: resolve(__dirname, "examples/vue-transitions/composition.html"),
      },
    },
  },
});
