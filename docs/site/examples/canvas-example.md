---
title: "Canvas Example"
description: "Using Helios with HTML5 Canvas"
---

# Canvas Example

The `simple-canvas-animation` example demonstrates a pure Vanilla JS approach to driving an HTML5 Canvas.

## Implementation

1.  **Setup Canvas**: Get the 2D context.
2.  **Initialize Helios**: Set duration and FPS.
3.  **Draw Function**: Create a function that takes `currentFrame` and renders the scene.
4.  **Subscribe**: Connect the draw function to the Helios update loop.

### Example Code

```javascript
import { Helios } from '@helios-project/core';

const canvas = document.getElementById('composition-canvas');
const ctx = canvas.getContext('2d');
const helios = new Helios({ duration: 5, fps: 30 });

// Allow external control
helios.bindToDocumentTimeline();

function draw(currentFrame) {
  const width = canvas.width;
  const height = canvas.height;

  // Clear
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, width, height);

  // Animation Logic
  const x = (currentFrame / (5 * 30)) * width;

  ctx.fillStyle = 'royalblue';
  ctx.beginPath();
  ctx.arc(x, height / 2, 50, 0, Math.PI * 2);
  ctx.fill();
}

// Drive the animation
helios.subscribe((state) => {
  draw(state.currentFrame);
});
```
