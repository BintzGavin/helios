---
title: "Simple Canvas Animation"
description: "Basic canvas animation loop with Helios."
---

# Simple Canvas Animation

This example demonstrates the fundamental pattern for driving an HTML5 Canvas animation with Helios.

## Overview

Instead of using `requestAnimationFrame` directly, we subscribe to Helios's state updates. This ensures the animation is synchronized with the timeline, supports seeking, and can be rendered deterministically.

## Code Example

```typescript
import { Helios, HeliosState } from '@helios-project/core';

// 1. Setup Canvas
const canvas = document.getElementById('composition-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// 2. Initialize Helios
const helios = new Helios({
    duration: 5,
    fps: 30
});

// Bind to document timeline for Renderer/Studio control
helios.bindToDocumentTimeline();

// 3. Draw Function
function draw(currentFrame: number) {
  const { width, height } = canvas;
  const time = currentFrame / helios.fps.value;
  const progress = (time % helios.duration.value) / helios.duration.value;

  // Clear
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, width, height);

  // Animate Position
  const x = progress * width;
  const y = height / 2;

  // Draw Circle
  ctx.fillStyle = 'royalblue';
  ctx.beginPath();
  ctx.arc(x, y, 50, 0, Math.PI * 2);
  ctx.fill();
}

// 4. Subscribe to Updates
helios.subscribe((state: HeliosState) => {
    draw(state.currentFrame);
});
```

## Best Practices

- **Clear Every Frame**: Always clear the canvas at the start of your draw function.
- **Use `currentFrame` or `currentTime`**: Derive all positions and styles from the current time. Do not use accumulated state (e.g., `x += 1`) as it breaks seeking.
- **Handle Resize**: Listen for window resize events to update canvas dimensions.
