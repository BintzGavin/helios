# Plan: SolidJS Lottie Animation

## 1. Context & Goal
- **Objective**: Create a new example `examples/solid-lottie-animation` demonstrating how to integrate `lottie-web` with SolidJS and Helios.
- **Trigger**: Vision gap - Lottie integration is demonstrated for React and Vue, but missing for SolidJS.
- **Impact**: Ensures feature parity across supported frameworks and provides a reference for SolidJS developers.

## 2. File Inventory

### Create
- `examples/solid-lottie-animation/composition.html`: Entry point.
- `examples/solid-lottie-animation/package.json`: Local package config (for type: module).
- `examples/solid-lottie-animation/vite.config.js`: Local development config.
- `examples/solid-lottie-animation/src/index.jsx`: SolidJS mount point.
- `examples/solid-lottie-animation/src/App.jsx`: Main component logic.
- `examples/solid-lottie-animation/src/animation.json`: Copy of the Lottie animation data from the Vue example.

### Modify
- `vite.build-example.config.js`: Update the `solidPlugin` include regex AND the `react` plugin exclude regex to include the new example directory.

### Read-Only
- `examples/vue-lottie-animation/src/animation.json`: Source for the animation data.

## 3. Implementation Spec

### Architecture
- **Framework**: SolidJS (using `.jsx` and `vite-plugin-solid`).
- **Animation Engine**: `lottie-web` driven by Helios frame updates.
- **State Management**: Helios subscription directly driving the imperative Lottie API (no intermediate signals needed for this performance-sensitive path).

### Pseudo-Code

**src/App.jsx**:
```jsx
import { onMount, onCleanup } from 'solid-js';
import { Helios } from '@helios-project/core';
import lottie from 'lottie-web';
import animationData from './animation.json';

// Initialize Helios
const helios = new Helios({
  fps: 30,
  duration: 2,
  autoSyncAnimations: true
});

helios.bindToDocumentTimeline();

export default function App() {
  let container; // Ref

  onMount(() => {
    // 1. Init Lottie
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData
    });

    // 2. Subscribe to Helios
    const unsubscribe = helios.subscribe((state) => {
      const timeMs = (state.currentFrame / state.fps) * 1000;
      anim.goToAndStop(timeMs, false);
    });

    // 3. Cleanup
    onCleanup(() => {
      unsubscribe();
      anim.destroy();
    });
  });

  return <div ref={container} style={{ width: '100%', height: '100%' }} />;
}
```

**vite.build-example.config.js**:
- Update both regexes to include `lottie` in the group:
  - From: `solid-(canvas|dom|threejs-canvas|captions)-animation`
  - To: `solid-(canvas|dom|threejs-canvas|captions|lottie)-animation`

### Dependencies
- `solid-js`
- `lottie-web`
- `@helios-project/core`

## 4. Test Plan

### Verification
1.  **Build**: Run `npm run build:examples`.
2.  **Verify Output**: Check that `output/example-build/examples/solid-lottie-animation/composition.html` exists.
3.  **Verify Assets**: Ensure compiled JS assets are generated in `output/example-build/assets/`.

### Success Criteria
- The build command completes without error.
- The output directory contains the compiled example.
