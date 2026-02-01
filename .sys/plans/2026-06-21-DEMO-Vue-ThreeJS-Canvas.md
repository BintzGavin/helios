# 📋 Plan: Create Vue 3 + Three.js Canvas Example

## 1. Context & Goal
- **Objective**: Create `examples/vue-threejs-canvas-animation` to demonstrate Three.js integration within a Vue 3 application driven by Helios.
- **Trigger**: Vision gap. The README promises "Any Framework" + "Canvas MVP" (Three.js), but currently only React (R3F) and Vanilla Three.js examples exist. Vue users lack a reference for deterministic Three.js rendering.
- **Impact**: Validates "Canvas MVP" capabilities for Vue developers and provides a canonical pattern for non-React WebGL integration.

## 2. File Inventory
- **Create**:
  - `examples/vue-threejs-canvas-animation/composition.html`: Entry point.
  - `examples/vue-threejs-canvas-animation/vite.config.js`: Vue plugin configuration.
  - `examples/vue-threejs-canvas-animation/src/main.js`: App mount point.
  - `examples/vue-threejs-canvas-animation/src/App.vue`: Main component containing Three.js logic.
  - `examples/vue-threejs-canvas-animation/src/composables/useVideoFrame.js`: Reusable composable for Helios state.
  - `examples/vue-threejs-canvas-animation/README.md`: Documentation.
- **Modify**: None.
- **Read-Only**: `examples/vue-canvas-animation/` (Reference pattern).

## 3. Implementation Spec
- **Architecture**:
  - **Framework**: Vue 3 Composition API (`<script setup>`).
  - **Graphics**: Vanilla `three` (no wrapper libraries to avoid extra deps).
  - **Pattern**:
    - Initialize `Helios` singleton in `main.js`.
    - Create a `useVideoFrame` composable that subscribes to `helios` and exposes a reactive `frame` ref.
    - In `App.vue`: Initialize `THREE.WebGLRenderer`, `Scene`, and `Camera` on mount.
    - Use `watch(frame, ...)` to update 3D object properties (rotation/position) and call `renderer.render()`.
    - **Crucial**: Disable the default Three.js `requestAnimationFrame` loop. Rendering must be exclusively driven by the Helios frame update to ensure deterministic capture.
- **Dependencies**: Uses existing root dependencies (`vue`, `three`).

## 4. Test Plan
- **Verification**:
  1. Build examples: `npm run build:examples`
  2. Run specific E2E verification: `npx tsx tests/e2e/verify-render.ts 'vue-threejs'`
- **Success Criteria**:
  - Build succeeds.
  - `verify-render.ts` detects the example as `canvas` mode (due to 'canvas' in directory name).
  - Video output is generated (approx 5s).
  - Video content is verified as non-black (via FFmpeg signalstats check).
