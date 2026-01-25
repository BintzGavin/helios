---
title: "Canvas Example"
description: "Drawing to HTML5 Canvas with Helios."
---

# Canvas Example

For high-performance 2D animations, you can draw directly to a `<canvas>`.

## Setup

```html
<canvas id="composition-canvas"></canvas>
```

## The Loop

```javascript
import { Helios } from '@helios-project/core';

const canvas = document.getElementById('composition-canvas');
const ctx = canvas.getContext('2d');

const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

function draw(currentFrame) {
  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate position
  const x = currentFrame * 5;

  // Draw
  ctx.fillStyle = 'royalblue';
  ctx.fillRect(x, 50, 100, 100);
}

// Subscribe to updates
helios.subscribe((state) => {
    draw(state.currentFrame);
});
```
