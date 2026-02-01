---
name: example-solid
description: Patterns for using Helios with SolidJS. Use when building compositions in a SolidJS environment, utilizing signals for fine-grained reactivity.
---

# SolidJS Composition Patterns

Integrate Helios into SolidJS components using Signals to manage frame state reactivity with high performance.

## Quick Start

### 1. Create Helios Signal

Wrap the Helios instance in a SolidJS signal to make state reactive.

```javascript
// lib/createHeliosSignal.js
import { createSignal, onCleanup } from 'solid-js';

export function createHeliosSignal(helios) {
  const [frame, setFrame] = createSignal(helios.getState());

  const unsubscribe = helios.subscribe((state) => {
    setFrame(state);
  });

  onCleanup(() => {
    unsubscribe();
  });

  return frame;
}
```

### 2. Create Composition Component

```jsx
// App.jsx
import { createEffect } from 'solid-js';
import { Helios } from '@helios-project/core';
import { createHeliosSignal } from './lib/createHeliosSignal';

// Initialize Helios (outside component or in a context)
const helios = new Helios({
  duration: 10,
  fps: 30,
  width: 1920,
  height: 1080
});

// Bind for external control
helios.bindToDocumentTimeline();

function App() {
  let canvasRef;

  // Create reactive accessor
  const state = createHeliosSignal(helios);

  createEffect(() => {
    const canvas = canvasRef;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { currentFrame, width, height } = state();

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw
    ctx.fillStyle = '#446b9e';
    const x = (currentFrame / (10 * 30)) * width;
    ctx.fillRect(x, height / 2 - 50, 100, 100);
  });

  return (
    <canvas
      ref={canvasRef}
      width={1920}
      height={1080}
      style={{ width: '100%', height: 'auto' }}
    />
  );
}

export default App;
```

## Key Concepts

- **Fine-Grained Reactivity:** SolidJS signals update only what changes. However, since Helios updates on every frame (30-60 times/sec), wrapping the entire state in a signal is the standard approach for canvas rendering.
- **`createEffect`:** Use `createEffect` to trigger imperative canvas drawing logic whenever the Helios signal updates.
- **Cleanup:** Always use `onCleanup` to remove the Helios subscription when the component unmounts.

## Source Files

- Helper: `examples/solid-animation-helpers/src/lib/createHeliosSignal.js`
- Example: `examples/solid-canvas-animation/`
