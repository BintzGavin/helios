---
title: "Three.js Examples"
description: "Using Helios with Three.js across different frameworks"
---

# Three.js Examples

Driving a 3D scene with Helios ensures deterministic rendering and frame-perfect synchronization. Instead of using Three.js's internal `Clock` or `requestAnimationFrame` loop directly, you let Helios drive the rendering.

## Core Concept (Vanilla)

Location: `examples/threejs-canvas-animation`

1.  **Scene Setup**: Create Scene, Camera, Renderer.
2.  **Render Loop**: Instead of a self-driving loop, create a function `render(time)` that updates object positions based on time and calls `renderer.render()`.
3.  **Subscribe**: Call your `render` function inside the Helios subscription.

```javascript
import { Helios } from '@helios-project/core';
import * as THREE from 'three';

const helios = new Helios({ duration: 10, fps: 60 });
helios.bindToDocumentTimeline();

// ... Three.js setup ...

helios.subscribe((state) => {
  const time = state.currentFrame / state.fps;

  // Update objects
  mesh.rotation.x = time * 0.5;
  mesh.rotation.y = time * 0.2;

  // Render frame
  renderer.render(scene, camera);
});
```

## React Three Fiber

Location: `examples/react-three-fiber`

In R3F, you disable the internal loop using `frameloop="never"` and manually advance the state in the Helios subscription.

```jsx
<Canvas frameloop="never">
  <MyScene />
</Canvas>

// In a component or hook
useFrame((state) => {
   // Manual update logic if needed
});

helios.subscribe((state) => {
   const time = state.currentFrame / state.fps;
   // Update R3F state or Three.js objects directly
   threeState.advance(time); // Or similar manual advancement
});
```

## Solid Three.js

Location: `examples/solid-threejs-canvas-animation`

Solid signals drive the updates efficiently. Since Solid doesn't have a heavy VDOM, you can often update Three.js properties directly inside `createEffect`.

## Svelte Three.js

Location: `examples/svelte-threejs-canvas-animation`

Svelte's reactivity (`$effect` or `$:`) updates the scene.

## Vue Three.js

Location: `examples/vue-threejs-canvas-animation`

Uses Vue's `watchEffect` or simple refs to drive the animation.
