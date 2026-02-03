# Context & Goal
- **Objective**: Create a `vue-lottie-animation` example to demonstrate how to integrate `lottie-web` with Vue 3 in Helios.
- **Trigger**: The "Any Framework" and "Any animation library" vision in `README.md` is currently only partially fulfilled for Lottie (Vanilla and React exist, but Vue/Svelte/Solid are missing).
- **Impact**: Unlocks the ability for Vue developers to easily use Lottie animations in their Helios compositions, closing a parity gap.

# File Inventory
- **Create**:
  - `examples/vue-lottie-animation/composition.html`: Entry point for the composition.
  - `examples/vue-lottie-animation/vite.config.js`: Vite configuration for Vue.
  - `examples/vue-lottie-animation/src/main.js`: Vue app mount point.
  - `examples/vue-lottie-animation/src/App.vue`: Main component containing Lottie integration logic.
  - `examples/vue-lottie-animation/src/animation.json`: Sample Lottie animation data (copied from `examples/lottie-animation/src/animation.json`).
- **Modify**: None.
- **Read-Only**: `examples/lottie-animation/src/animation.json` (source for copy).

# Implementation Spec
- **Architecture**:
  - **Framework**: Vue 3 using Composition API (`<script setup>`).
  - **Bundler**: Vite with `@vitejs/plugin-vue`.
  - **Library**: `lottie-web` (already in devDependencies).
  - **State**: `Helios` instance from `@helios-project/core`.
- **Pseudo-Code**:
  ```javascript
  // App.vue
  import { onMounted, ref } from 'vue';
  import { Helios } from '@helios-project/core';
  import lottie from 'lottie-web';
  import animationData from './animation.json';

  const container = ref(null);
  const helios = new Helios({ fps: 30, duration: 5 });

  onMounted(() => {
    // 1. Load Animation
    const anim = lottie.loadAnimation({
      container: container.value,
      renderer: 'svg', // or canvas
      loop: false,
      autoplay: false,
      animationData
    });

    // 2. Subscribe to Helios
    helios.subscribe(({ currentFrame, fps }) => {
      const timeMs = (currentFrame / fps) * 1000;
      anim.goToAndStop(timeMs, false); // false = milliseconds
    });
  });
  ```
- **Dependencies**:
  - `lottie-web`
  - `vue`
  - `@helios-project/core`

# Test Plan
- **Verification**:
  1. Run `npm run build:examples` to ensure the project compiles.
  2. Run `npx tsx tests/e2e/verify-render.ts vue-lottie-animation` to verify the rendering pipeline.
- **Success Criteria**:
  - The build process completes without errors.
  - The verification script reports "Passed!" for `vue-lottie-animation`.
  - An MP4 file is generated at `output/vue-lottie-animation-render-verified.mp4`.
- **Edge Cases**:
  - Ensure `composition.html` path is correct so `vite.build-example.config.js` auto-discovers it.
  - Ensure `animation.json` is correctly imported and passed to `lottie.loadAnimation`.
