# Vue 3 + Three.js Canvas Animation

This example demonstrates how to integrate Three.js with Helios in a Vue 3 application using the Composition API.

## Key Concepts

- **Helios Integration**: The `Helios` instance is initialized in the top-level script setup and bound to the document timeline.
- **Reactive Frame State**: A custom composable `useVideoFrame` subscribes to Helios updates and exposes a reactive `frame` ref.
- **Three.js Rendering**:
  - The `THREE.WebGLRenderer` is initialized on mount.
  - Instead of a standard requestAnimationFrame loop, the scene update and `renderer.render()` call are triggered reactively by `watch(frame)`.
  - This ensures deterministic rendering synchronized with the Helios timeline.

## Running the Example

```bash
# Start the dev server
npm run dev:threejs

# Or directly with vite
npx vite examples/vue-threejs-canvas-animation
```

## Rendering to Video

```bash
# Build the example
npm run build:examples

# Render to MP4
npx tsx packages/renderer/scripts/render.ts
```
