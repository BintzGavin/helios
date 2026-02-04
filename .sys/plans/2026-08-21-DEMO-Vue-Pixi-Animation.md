# 2026-08-21-DEMO-Vue-Pixi-Animation

## 1. Context & Goal
- **Objective**: Create a Vue 3 example demonstrating integration with PixiJS v8.
- **Trigger**: Parity gap identified; React and Vanilla PixiJS examples exist, but Vue is missing.
- **Impact**: Demonstrates how to use high-performance 2D graphics with Vue, expanding framework coverage for the "Canvas MVP".

## 2. File Inventory
- **Create**:
    - `examples/vue-pixi-animation/vite.config.js`: Vite config with Vue plugin, workspace root search, and `/packages/` alias (matching existing examples).
    - `examples/vue-pixi-animation/composition.html`: Entry point HTML.
    - `examples/vue-pixi-animation/src/main.js`: Vue app entry point.
    - `examples/vue-pixi-animation/src/App.vue`: Main component implementing PixiJS initialization and Helios subscription.
- **Modify**: None.
- **Read-Only**:
    - `examples/vue-threejs-canvas-animation/`: For pattern reference.
    - `examples/react-pixi-animation/`: For PixiJS v8 usage reference.

## 3. Implementation Spec
- **Architecture**:
    - **Vue 3**: Composition API (`<script setup>`) for component lifecycle.
    - **PixiJS v8**: `Application.init()` (async) and `destroy()`.
    - **Helios**: Direct imperative subscription in `onMounted` to drive PixiJS scene graph (bypassing Vue reactivity for the render loop).
- **Pseudo-Code (App.vue)**:
    - `import { onMounted, onUnmounted, ref } from 'vue'`
    - `import { Application, Graphics } from 'pixi.js'`
    - `import { Helios } from '../../../packages/core/src/index.ts'` (Using relative import)
    - Init Helios instance, bind to document timeline.
    - `onMounted` (async):
        - Create Pixi `Application`.
        - `await app.init({ resizeTo: window, backgroundColor: 0x111111, antialias: true })`
        - Check if still mounted (using a flag) before proceeding.
        - Append `app.canvas` to ref container.
        - Create graphics (e.g., rotating rect).
        - Add graphics to `app.stage`.
        - `helios.subscribe`: Update graphics properties based on `state.currentTime` / `state.currentFrame`.
    - `onUnmounted`:
        - `helios.unsubscribe`.
        - Set mounted flag to false.
        - `app.destroy({ removeView: true, children: true })`.

- **Dependencies**: Uses root `package.json` dependencies (`vue`, `pixi.js`, `vite`).

## 4. Test Plan
- **Verification**:
    - Run `npm run build:examples`.
    - Check if `output/example-build/examples/vue-pixi-animation/composition.html` exists.
    - (Manual) Open `output/example-build/examples/vue-pixi-animation/composition.html` in browser to verify rotation.
- **Success Criteria**: Build succeeds, file artifact is generated in the output directory.
- **Edge Cases**: Async initialization race conditions (unmounted before init completes) - handled by `mounted` flag check.
