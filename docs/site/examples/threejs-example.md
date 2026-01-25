---
title: "Three.js Example"
description: "3D Animation with Three.js and Helios."
---

# Three.js Example

Helios can drive 3D scenes by updating object properties based on the current frame.

## Setup

```javascript
import * as THREE from 'three';
import { Helios } from '@helios-project/core';

// ... Standard Three.js setup (scene, camera, renderer) ...
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

function draw(frame) {
  const time = frame / 30;

  // Update 3D objects
  cube.rotation.x = time;
  cube.rotation.y = time;

  // Render Scene
  renderer.render(scene, camera);
}

helios.subscribe((state) => {
  draw(state.currentFrame);
});
```
