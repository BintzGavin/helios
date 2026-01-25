---
name: example-canvas
description: Patterns for using Helios with Vanilla Canvas API. Use when building high-performance 2D/3D animations without frameworks.
---

# Vanilla Canvas Patterns

Use Helios directly with the HTML5 Canvas API. This provides the lowest overhead and highest performance.

## Quick Start

### 1. HTML Setup

```html
<!-- composition.html -->
<canvas id="canvas"></canvas>
<script type="module" src="./main.js"></script>
```

### 2. Logic Setup

```javascript
// main.js
import { Helios } from '@helios-project/core';

// Setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const width = 1920;
const height = 1080;

canvas.width = width;
canvas.height = height;

// Initialize Helios
const helios = new Helios({
  duration: 5,
  fps: 60
});
helios.bindToDocumentTimeline();
window.helios = helios;

// Draw Function
function draw(frame) {
  // Clear
  ctx.clearRect(0, 0, width, height);

  // Calculate state
  const time = frame / helios.fps;
  const t = time / helios.duration; // 0..1

  // Draw
  const x = t * (width - 100);
  ctx.fillStyle = 'tomato';
  ctx.fillRect(x, height / 2 - 50, 100, 100);
}

// Subscribe
helios.subscribe((state) => {
  draw(state.currentFrame);
});

// Initial Render
draw(0);
```

## Performance Tips

- **Pre-calculate values:** Do heavy math (like sine tables or physics simulations) upfront if possible.
- **OffscreenCanvas:** For very complex scenes, consider rendering in a Web Worker using `OffscreenCanvas` to keep the main thread free.
- **Batch Draw Calls:** Minimize context state changes (`fillStyle`, `strokeStyle`, etc).

## Source Files

- Example: `examples/simple-canvas-animation/`
