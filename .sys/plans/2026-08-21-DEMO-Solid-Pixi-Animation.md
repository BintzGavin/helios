# Context & Goal
- **Objective**: Create a SolidJS + PixiJS example (`examples/solid-pixi-animation`) to ensure framework parity.
- **Trigger**: Vision gap identified—React and Vue have PixiJS examples, but SolidJS does not.
- **Impact**: Demonstrates that Helios supports "Any Framework" + "Canvas" using SolidJS, fulfilling the "Use What You Know" promise.

# File Inventory
- **Create**:
  - `examples/solid-pixi-animation/vite.config.js`: Vite config with `vite-plugin-solid`.
  - `examples/solid-pixi-animation/composition.html`: Entry point.
  - `examples/solid-pixi-animation/src/index.jsx`: Mounts the Solid app.
  - `examples/solid-pixi-animation/src/App.jsx`: Main logic (Helios + PixiJS integration).
- **Modify**:
  - `vite.build-example.config.js`: Update `include` (Solid) and `exclude` (React) regexes to handle the new directory.
- **Read-Only**: `packages/core/src/index.ts` (Imported by example).

# Implementation Spec
- **Architecture**:
  - **Framework**: SolidJS (using `solid-js` and `vite-plugin-solid`).
  - **Renderer**: PixiJS v8 (using `pixi.js`).
  - **Pattern**: Imperative PixiJS initialization inside `onMount` (Solid's effect hook equivalent for mounting), ensuring cleanup in `onCleanup`.
  - **State**: `Helios` instance drives the animation via `subscribe`.
- **Logic Flow (App.jsx)**:
  1. Initialize `Helios` (duration: 5, fps: 30).
  2. Call `helios.bindToDocumentTimeline()` to ensure automation support.
  3. Expose `window.helios` for the Player/Studio.
  4. In `onMount`:
     - Initialize `Pixi.Application` with `resizeTo: window`.
     - Create a simple `Graphics` object (e.g., a rotating rectangle).
     - Subscribe to `helios` updates: `helios.subscribe((state) => { updateGraphic(state.currentTime); })`.
  5. In `onCleanup`:
     - Destroy Pixi app (`app.destroy({ removeView: true })`).
     - Unsubscribe from Helios.
- **Config Update**:
  - In `vite.build-example.config.js`, update the regex `/examples\/solid-(canvas|dom|threejs-canvas|captions|lottie)-animation/` to include `pixi`.
  - Resulting regex fragment: `solid-(canvas|dom|threejs-canvas|captions|lottie|pixi)-animation`.

# Test Plan
- **Verification**: `npm run build:examples`
- **Success Criteria**:
  - Build completes successfully.
  - `output/example-build/examples/solid-pixi-animation/composition.html` exists.
  - No errors related to "JSX" or "syntax" in the build log (confirming correct plugin handling).
- **Edge Cases**:
  - Ensure `vite.build-example.config.js` regex matches strictly to avoid conflicts with React examples.
