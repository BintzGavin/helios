---
title: "Three.js Example"
description: "Using Helios with Three.js"
---

# Three.js Example

The `threejs-canvas-animation` example shows how to drive a 3D scene using Helios.

## Concept

Instead of using Three.js's internal `Clock` or `requestAnimationFrame` loop directly, you let Helios drive the rendering.

### Implementation

1.  **Scene Setup**: Create Scene, Camera, Renderer.
2.  **Disable Auto-Clear**: (Optional, depending on usage).
3.  **Render Loop**: Instead of a self-driving loop, create a function `render(time)` that updates object positions based on time and calls `renderer.render()`.
4.  **Subscribe**: Call your `render` function inside the Helios subscription.

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
