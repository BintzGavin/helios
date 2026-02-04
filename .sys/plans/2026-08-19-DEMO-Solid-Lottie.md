# Plan: Implement SolidJS Lottie Animation Example

## 1. Context & Goal
- **Objective**: Create `examples/solid-lottie-animation` to demonstrate Lottie integration with SolidJS.
- **Trigger**: Parity gap; React, Vue, and Svelte already have Lottie examples.
- **Impact**: Unlocks Lottie usage for SolidJS users and ensures cross-framework parity.

## 2. File Inventory

### Create
- `examples/solid-lottie-animation/composition.html`: Entry point.
- `examples/solid-lottie-animation/vite.config.js`: Vite configuration for Solid (imports `vite-plugin-solid`).
- `examples/solid-lottie-animation/package.json`: Dependency declaration.
- `examples/solid-lottie-animation/src/index.jsx`: Application mount point.
- `examples/solid-lottie-animation/src/App.jsx`: Main logic connecting Helios and Lottie.
- `examples/solid-lottie-animation/src/lib/createHeliosSignal.js`: Adapter for Helios signals.
- `examples/solid-lottie-animation/src/animation.json`: Sample animation data (copied from React example).

### Modify
- `vite.build-example.config.js`: Update the `solidPlugin` include regex and `react` exclude regex to include `examples/solid-lottie-animation`.

## 3. Implementation Spec

### Architecture
- **Framework**: SolidJS + `lottie-web` (SVG renderer).
- **Tooling**: Vite with `vite-plugin-solid`.
- **State Management**: `createHeliosSignal` converts Helios callbacks to Solid signals.
- **Synchronization**: `createEffect` observes the frame signal and calls `animation.goToAndStop(ms)`.
- **Lifecycle**: `onMount` loads the animation; `onCleanup` destroys it.

### Pseudo-Code
1. Initialize Helios instance and bind to document timeline.
2. Create a signal adapter using `createHeliosSignal` (which subscribes to Helios updates).
3. In the component, use `onMount` to load the Lottie animation into a container ref using `lottie.loadAnimation`.
4. Use `createEffect` to observe the frame signal, convert frame to milliseconds (`frame / fps * 1000`), and call `animation.goToAndStop(ms)`.
5. Use `onCleanup` to destroy the animation instance.

### Dependencies
- `solid-js`
- `lottie-web`
- `@helios-project/core`
- `vite`
- `vite-plugin-solid`

## 4. Test Plan
- **Verification**: Run `npm run build:examples`.
- **Success Criteria**:
  - Build completes successfully.
  - `output/example-build/examples/solid-lottie-animation/composition.html` exists.
  - The include regex in `vite.build-example.config.js` is updated to allow Solid compilation for this directory.
