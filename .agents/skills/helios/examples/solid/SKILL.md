---
name: example-solid
description: SolidJS integration patterns for Helios. Use when creating compositions with SolidJS, using signals to drive animations.
---

# SolidJS + Helios

Integrate Helios with SolidJS by wrapping the Helios state in a reactive Signal. This allows you to drive your UI components purely from the timeline state.

## Quick Start

### 1. Create a Helper Hook

Create `src/lib/createHeliosSignal.js` (or `.ts`):

```typescript
import { createSignal, onCleanup, onMount } from 'solid-js';

export function createHeliosSignal(helios) {
  // Initialize signal with current state
  const [state, setState] = createSignal(helios.getState());

  onMount(() => {
    // Subscribe to Helios updates
    const unsub = helios.subscribe(setState);

    // Cleanup on unmount
    onCleanup(() => {
      unsub();
    });
  });

  return state;
}
```

### 2. Use in Component

```jsx
import { createEffect } from 'solid-js';
import { createHeliosSignal } from './lib/createHeliosSignal';
import { Helios } from '@helios-project/core';

// Initialize globally or in a context
if (!window.helios) {
  window.helios = new Helios({ fps: 30, duration: 10 });
}

function App() {
  const frame = createHeliosSignal(window.helios);

  return (
    <div>
      <h1>Frame: {frame().currentFrame}</h1>
      <div
        style={{
          width: '100px',
          height: '100px',
          background: 'red',
          transform: `translateX(${frame().currentFrame}px)`
        }}
      />
    </div>
  );
}
```

## Key Patterns

### Canvas Rendering with Effects

Use `createEffect` to react to frame changes and draw to a canvas imperatively.

```jsx
function CanvasAnimation() {
  let canvasRef;
  const frame = createHeliosSignal(window.helios);

  createEffect(() => {
    const canvas = canvasRef;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const { currentFrame, width, height } = frame();

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw based on frame
    ctx.fillStyle = 'blue';
    ctx.fillRect(currentFrame, 50, 50, 50);
  });

  return <canvas ref={canvasRef} width={1920} height={1080} />;
}
```

## Common Issues

- **Signal Granularity**: `createHeliosSignal` updates the entire state object on every frame. If performance is an issue with many components, consider creating derived signals (`createMemo`) for specific properties like `currentFrame` to avoid re-rendering unrelated parts of the tree (though SolidJS is generally fine with fine-grained updates).
- **Context Initialization**: Ensure `window.helios` is initialized before the component mounts, or use a Context Provider pattern to pass the instance down.

## Source Files

- Example: `examples/solid-canvas-animation/`
