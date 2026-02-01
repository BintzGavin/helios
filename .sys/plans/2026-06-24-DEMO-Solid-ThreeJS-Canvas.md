# 2026-06-24-DEMO-Solid-ThreeJS-Canvas.md

#### 1. Context & Goal
- **Objective**: Create `examples/solid-threejs-canvas-animation` to demonstrate Three.js integration with SolidJS, completing the framework matrix for Three.js support.
- **Trigger**: Vision gap - Three.js support is a core feature, but SolidJS lacked a specific Three.js example (unlike React, Vue, and Svelte).
- **Impact**: Provides a reference implementation for SolidJS users wanting high-performance WebGL rendering, ensuring feature parity across all supported frameworks.

#### 2. File Inventory
- **Create**:
  - `examples/solid-threejs-canvas-animation/package.json`: Dependency definition (Solid + Three).
  - `examples/solid-threejs-canvas-animation/vite.config.js`: Vite configuration for Solid.
  - `examples/solid-threejs-canvas-animation/composition.html`: Entry point.
  - `examples/solid-threejs-canvas-animation/src/index.jsx`: Application mount point.
  - `examples/solid-threejs-canvas-animation/src/App.jsx`: Main component with Three.js + Helios integration.
  - `examples/solid-threejs-canvas-animation/src/lib/createHeliosSignal.js`: Helper for reactive Helios state.
- **Modify**:
  - `vite.build-example.config.js`: Add `solid-threejs-canvas-animation` to the `vite-plugin-solid` include list and `vite-plugin-react` exclude list to ensure correct building.
- **Read-Only**:
  - `packages/core/src/index.ts` (Import target)

#### 3. Implementation Spec
- **Architecture**:
  - Use `vite-plugin-solid` for compilation.
  - Use `createHeliosSignal` (wrapping `helios.subscribe`) to expose `currentFrame` as a Solid Signal.
  - Initialize Three.js (`WebGLRenderer`, `Scene`, `Camera`, `Mesh`) in `onMount`.
  - Use `createEffect` dependent on the frame signal to drive the `renderer.render()` loop, ensuring synchronization with Helios.
  - Clean up resources (renderer dispose) in `onCleanup`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. `npm run build:examples` - Verify the updated build config correctly compiles the new example.
  2. `npx tsx tests/e2e/verify-render.ts 'Solid Threejs'` - Verify the example renders correctly (producing a video file with expected duration and content).
- **Success Criteria**:
  - Build succeeds without errors.
  - Verification script passes, outputting a valid `.mp4` file.
- **Edge Cases**:
  - Resize handling: Ensure canvas resizes correctly (handled by standard logic in `App.jsx`).
  - Cleanup: Ensure no WebGL context leaks on unmount (handled by `onCleanup`).
