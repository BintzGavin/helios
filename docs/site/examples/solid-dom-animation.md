---
title: "Solid DOM Animation"
description: "Using SolidJS signals to drive DOM updates"
---

# Solid DOM Animation

This example demonstrates how to use [SolidJS](https://www.solidjs.com/) with Helios. Solid's fine-grained reactivity is a perfect match for high-performance animation.

## Key Concepts

- **Helios Signal Adapter**: Creating a bridge between Helios state and Solid signals.
- **Derived State**: Using `createMemo` to compute animation values efficiently.
- **Direct DOM Updates**: Solid updates the DOM directly without a Virtual DOM overhead.

## Implementation

We create a `createHeliosSignal` primitive that subscribes to Helios and returns a Solid accessor.

```javascript
// src/lib/createHeliosSignal.js
import { createSignal, onCleanup, onMount } from 'solid-js';

export function createHeliosSignal(helios) {
  const [state, setState] = createSignal(helios.getState());

  onMount(() => {
    const unsub = helios.subscribe(setState);
    onCleanup(() => {
      unsub();
    });
  });

  return state;
}
```

Then we use it in our component:

```jsx
// src/App.jsx
import { createMemo } from 'solid-js';
import { createHeliosSignal } from './lib/createHeliosSignal';

function App() {
  // Access the global helios instance
  const state = createHeliosSignal(window.helios);

  // Derived state for rotation (0 to 360 deg)
  const rotation = createMemo(() => {
    const s = state();
    const totalFrames = s.duration * window.helios.fps;
    const progress = totalFrames > 0 ? s.currentFrame / totalFrames : 0;
    return progress * 360;
  });

  return (
    <div class="container">
      <div
        class="box signal-box"
        style={{ transform: `rotate(${rotation()}deg)` }}
      >
        Signal
      </div>
    </div>
  );
}
```
