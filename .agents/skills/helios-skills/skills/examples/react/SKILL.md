---
name: example-react
description: Patterns for using Helios with React. Use when building compositions in a React environment.
---

# React Composition Patterns

Integrate Helios into React components using hooks for state management and Refs for canvas access.

## Quick Start

### 1. Create `useVideoFrame` Hook

This hook subscribes to Helios and returns the current frame, triggering re-renders.

```javascript
// hooks/useVideoFrame.js
import { useState, useEffect } from 'react';

export function useVideoFrame(helios) {
  const [frame, setFrame] = useState(helios.currentFrame.peek());

  useEffect(() => {
    // Subscribe to updates
    const unsubscribe = helios.subscribe((state) => {
      setFrame(state.currentFrame);
    });
    return unsubscribe;
  }, [helios]);

  return frame;
}
```

### 2. Create Composition Component

```jsx
// App.jsx
import React, { useRef, useEffect } from 'react';
import { Helios } from '@helios-project/core';
import { useVideoFrame } from './hooks/useVideoFrame';

// Initialize Singleton (outside component to persist across re-renders)
const helios = new Helios({
  duration: 10,
  fps: 30
});
helios.bindToDocumentTimeline();

// Expose for Renderer/Player
if (typeof window !== 'undefined') window.helios = helios;

export default function App() {
  const canvasRef = useRef(null);
  const frame = useVideoFrame(helios);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasRef.current;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw based on frame
    const progress = frame / (helios.duration * helios.fps);
    ctx.fillStyle = '#61dafb';
    ctx.fillRect(progress * width, height / 2 - 50, 100, 100);

  }, [frame]); // Re-run draw when frame changes

  return <canvas ref={canvasRef} width={1920} height={1080} />;
}
```

## Optimization

For complex scenes, avoid React state updates for every frame (which triggers full component re-render). Instead, use a `useRef` to hold the frame and an animation loop, or update the canvas imperatively inside `subscribe`.

### Imperative Pattern (High Performance)

```jsx
useEffect(() => {
  const ctx = canvasRef.current.getContext('2d');

  const unsubscribe = helios.subscribe((state) => {
    // Draw directly without triggering React render
    drawScene(ctx, state.currentFrame);
  });

  return unsubscribe;
}, []);
```

## Source Files

- Example: `examples/react-canvas-animation/`
