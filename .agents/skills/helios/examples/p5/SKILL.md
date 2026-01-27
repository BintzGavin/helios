---
name: example-p5-animation
description: Learn how to use P5.js with Helios. Use when creating creative coding sketches or generative art.
---

# P5.js Animation

Integrate P5.js with Helios by using P5's **Instance Mode** and driving the `draw()` loop via Helios's state.

## Quick Start

```typescript
import { Helios } from '@helios-project/core';
import p5 from 'p5';

const helios = new Helios({ duration: 10, fps: 60 });

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(1920, 1080);
    p.noLoop(); // Disable P5's internal loop
  };

  p.draw = () => {
    // Get time from Helios
    const { currentFrame, fps } = helios.getState();
    const time = currentFrame / fps;

    p.background(200);
    p.fill(255, 0, 0);

    // Animate based on time
    const x = time * 100;
    p.circle(x, 540, 50);
  };
};

new p5(sketch, document.getElementById('canvas-container'));

// Drive P5 from Helios
helios.subscribe(() => {
  // Manually trigger P5 redraw
  // Note: If you have a reference to the p5 instance, call instance.redraw()
  // Or simply put drawing logic here directly.
});
```

## Key Patterns

### Instance Mode
Always use Instance Mode (`new p5(sketch)`) instead of Global Mode. This prevents global variable pollution and ensures compatibility with module bundlers.

### Disable Internal Loop
Call `p.noLoop()` in `setup()`. P5's internal loop uses `requestAnimationFrame` which runs independently of Helios. By disabling it, you ensure P5 only draws when Helios updates.

### Reactive Drawing
Instead of relying on P5's `frameCount`, calculate positions based on `helios.getState().currentFrame`.

```typescript
helios.subscribe(() => {
   // Assuming 'myp5' is your instance
   myp5.redraw();
});
```

## Source
- Example: `examples/p5-canvas-animation/`
