---
title: "React Examples"
description: "Using Helios with React"
---

# React Examples

Helios works seamlessly with React. Since Helios is framework-agnostic, you can use it to drive React state or refs.

## DOM Animation

The `react-dom-animation` example demonstrates how to use `Helios` to drive CSS properties via inline styles or CSS-in-JS.

### Setup

1.  **Initialize Helios**: Create a Helios instance.
2.  **Bind to Timeline**: Call `helios.bindToDocumentTimeline()` to allow the browser (and Renderer) to drive the clock.
3.  **Use Hook**: Create a `useVideoFrame` hook to subscribe to Helios updates and trigger re-renders.

### The `useVideoFrame` Hook

This hook subscribes to the Helios instance and keeps a local state variable in sync with the current frame.

```javascript
import { useState, useEffect } from 'react';

export function useVideoFrame(helios) {
    const [frame, setFrame] = useState(helios.getState().currentFrame);

    useEffect(() => {
        // Update local state when helios state changes
        const update = (state) => setFrame(state.currentFrame);

        // Subscribe returns an unsubscribe function
        return helios.subscribe(update);
    }, [helios]);

    return frame;
}
```

### Example Component

```jsx
import React from 'react';
import { Helios } from '@helios-project/core';
import { useVideoFrame } from './hooks/useVideoFrame';

const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

export default function App() {
  const frame = useVideoFrame(helios);

  // Calculate animation values based on current frame
  const progress = frame / (5 * 30);
  const rotation = progress * 360;

  return (
    <div style={{
      transform: `rotate(${rotation}deg)`,
      width: 100,
      height: 100,
      background: 'red'
    }}>
      Frame: {frame.toFixed(2)}
    </div>
  );
}
```

## Canvas Animation

The `react-canvas-animation` example shows how to use Helios to drive a `<canvas>` element within a React component.

In this case, you typically use a `useLayoutEffect` or `useEffect` to subscribe to Helios and draw to the canvas context imperatively, avoiding React render cycle overhead for the canvas content itself.

```jsx
useEffect(() => {
  const ctx = canvasRef.current.getContext('2d');

  return helios.subscribe((state) => {
    // Clear and draw based on state.currentFrame
    draw(ctx, state.currentFrame);
  });
}, []);
```
