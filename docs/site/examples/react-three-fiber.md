---
title: "React Three Fiber"
description: "Driving a 3D scene with Helios and React Three Fiber"
---

# React Three Fiber

This example demonstrates how to integrate Helios with `@react-three/fiber` (R3F) to drive a 3D scene deterministically.

## Concept

By default, R3F runs its own render loop using `requestAnimationFrame`. To synchronize it with Helios (and allow for offline rendering), we need to:
1.  Disable R3F's internal loop (`frameloop="never"`).
2.  Manually advance the R3F state inside the Helios subscription.

## Implementation

### App Component

```tsx
import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Helios } from '@helios-project/core';
import Scene from './Scene';

const helios = new Helios({
    fps: 30,
    duration: 10
});

helios.bindToDocumentTimeline();

export default function App() {
    const [r3fState, setR3fState] = useState(null);

    useEffect(() => {
        if (!r3fState) return;

        // Drive R3F loop manually via Helios subscription
        return helios.subscribe((state) => {
            // R3F expects time in seconds
            const timeInSeconds = state.currentFrame / state.fps;

            // Advance the Three.js clock and render the scene
            r3fState.advance(timeInSeconds);
        });
    }, [r3fState]);

    return (
        <Canvas
            frameloop="never" // Disable internal loop
            onCreated={(state) => setR3fState(state)} // Capture R3F state
            camera={{ position: [0, 0, 5] }}
        >
            <Scene />
        </Canvas>
    );
}
```

### Scene Components

Inside your scene, you can use `useFrame` or refs as usual, but remember that the "time" is now being dictated by `r3fState.advance()`.

```tsx
// Scene.jsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function Scene() {
  const mesh = useRef();

  useFrame((state, delta) => {
    // This runs when r3fState.advance() is called
    // state.clock.elapsedTime will match Helios time
    mesh.current.rotation.x = state.clock.elapsedTime;
  });

  return (
    <mesh ref={mesh}>
      <boxGeometry />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}
```
