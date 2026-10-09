---
name: example-threejs
description: Patterns for using Helios with Three.js and React Three Fiber. Use when creating 3D animations or integrating WebGL scenes.
---

# Three.js Composition Patterns

Integrate Helios with Three.js to drive 3D animations frame-by-frame. This ensures deterministic rendering and perfect synchronization.

## Quick Start (React Three Fiber)

The key is to disable the R3F internal loop (`frameloop="never"`) and drive the scene update manually via the `advance()` method in a Helios subscription.

### 1. Setup Component

```jsx
import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Helios } from '@helios-project/core';

// Singleton Helios instance
const helios = new Helios({
  fps: 30,
  duration: 10,
  width: 1920,
  height: 1080
});

if (typeof window !== 'undefined') {
    window.helios = helios; // Expose for Player/Renderer
}

export default function App() {
  const [r3fState, setR3fState] = useState(null);

  useEffect(() => {
    if (!r3fState) return;

    // Subscribe to Helios ticks
    const unsubscribe = helios.subscribe((state) => {
      // Calculate time in seconds
      const timeInSeconds = state.currentFrame / state.fps;

      // Manually advance R3F state
      // This updates the clock and renders the scene
      r3fState.advance(timeInSeconds);
    });

    return unsubscribe;
  }, [r3fState]);

  return (
    <Canvas
      frameloop="never" // Disable automatic loop
      onCreated={(state) => setR3fState(state)} // Capture R3F state
      gl={{ antialias: true }}
    >
      <Scene />
    </Canvas>
  );
}
```

### 2. Scene Component

Use `useFrame` as usual, but it will only fire when `advance()` is called.

```jsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

function Scene() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    // state.clock.elapsedTime is now synced with Helios
    const time = state.clock.elapsedTime;

    if (meshRef.current) {
        meshRef.current.rotation.x = time;
        meshRef.current.rotation.y = time * 0.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}
```

## Quick Start (Vanilla Three.js)

For vanilla Three.js, you simply call `renderer.render()` inside the Helios subscription.

```javascript
import * as THREE from 'three';
import { Helios } from '@helios-project/core';

// Setup Helios
const helios = new Helios({ duration: 5, fps: 30 });
window.helios = helios;

// Setup Three.js
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1920 / 1080, 0.1, 1000);
const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
scene.add(cube);

// Animation Loop
helios.subscribe((state) => {
  const time = state.currentFrame / state.fps;

  // Update logic
  cube.rotation.x = time;
  cube.rotation.y = time;

  // Render
  renderer.render(scene, camera);
});
```

## Optimization Tips

- **Antialiasing:** Enable it in `WebGLRenderer` or `<Canvas>` for better quality, but be aware of performance cost.
- **Shadows:** If using shadows, ensure they update correctly. In `frameloop="never"`, you might need to mark shadows as needing update if they are static.
- **GLTF Loading:** Use `waitUntilStable` or ensure assets are loaded before rendering starts. Helios waits for `window.load` by default in 'dom' mode, but 'canvas' mode relies on the canvas being ready.

## Source Files

- Example: `examples/react-three-fiber/`
- Example: `examples/threejs-canvas-animation/`
