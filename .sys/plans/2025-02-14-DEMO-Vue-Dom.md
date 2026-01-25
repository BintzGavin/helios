# 2025-02-14-DEMO-Vue-Dom

#### 1. Context & Goal
- **Objective**: Scaffold the missing `examples/vue-dom-animation` example to demonstrate Vue 3 support for DOM-based video composition.
- **Trigger**: The Vision in `README.md` promises "Use What You Know" with Vue, but only a canvas example exists. A DOM-based example is required to demonstrate standard CSS/style animation support.
- **Impact**: Unlocks the ability for Vue developers to build standard HTML/CSS video compositions, completing the framework matrix (React is already supported).

#### 2. File Inventory
- **Create**:
  - `examples/vue-dom-animation/package.json`: Defines dependencies (Vue, Vite, Helios Core).
  - `examples/vue-dom-animation/vite.config.js`: Vite build configuration.
  - `examples/vue-dom-animation/index.html`: Development entry point.
  - `examples/vue-dom-animation/composition.html`: Production/Renderer entry point.
  - `examples/vue-dom-animation/src/main.js`: Application entry point.
  - `examples/vue-dom-animation/src/App.vue`: Main component demonstrating usage.
  - `examples/vue-dom-animation/src/composables/useVideoFrame.js`: Vue composable for Helios state.
- **Modify**:
  - `tests/e2e/verify-render.ts`: Add `vue-dom-animation` to the list of examples to verify.
- **Read-Only**:
  - `examples/vue-canvas-animation/src/composables/useVideoFrame.js`: Source for the composable logic.

#### 3. Implementation Spec
- **Architecture**:
  - Use Vite as the bundler (consistent with other examples).
  - Use Vue 3 Composition API (`<script setup>`).
  - `App.vue` will instantiate `Helios` and use `useVideoFrame` to drive a simple style-based animation (e.g., opacity or transform).
  - **Crucially**, it must support both `index.html` (dev) and `composition.html` (prod) entry points.
- **Pseudo-Code**:
  - **useVideoFrame.js**:
    ```javascript
    import { ref, onUnmounted } from 'vue';
    export function useVideoFrame(helios) {
      const frame = ref(helios.getState().currentFrame);
      const unsub = helios.subscribe(state => frame.value = state.currentFrame);
      onUnmounted(unsub);
      return frame;
    }
    ```
  - **App.vue**:
    ```html
    <script setup>
    import { Helios } from '@helios-engine/core';
    import { useVideoFrame } from './composables/useVideoFrame';

    // Initialize Helios (idempotent)
    const helios = new Helios({ fps: 30, duration: 5 }); // 5 seconds
    const frame = useVideoFrame(helios);
    </script>
    <template>
      <div :style="{ opacity: frame / 150 }">Hello Vue</div>
    </template>
    ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. `cd examples/vue-dom-animation && npm install`
  2. `npm run build` (Should produce `dist/composition.html`)
  3. `npx ts-node tests/e2e/verify-render.ts` (Should pass for 'vue-dom-animation')
- **Success Criteria**:
  - The verification script successfully renders the Vue example to a video file without timeout or error.
  - The output video shows the element animating (verifiable via manual check or implicit in the E2E success).
- **Edge Cases**:
  - Ensure `composition.html` correctly mounts the app (often requires slightly different pathing than `index.html` in Vite).
