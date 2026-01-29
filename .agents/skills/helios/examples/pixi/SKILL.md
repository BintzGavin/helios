---
name: example-pixi
description: PixiJS integration patterns for Helios. Use when creating high-performance WebGL 2D animations with PixiJS.
---

# PixiJS + Helios

Integrate Helios with PixiJS by driving the Pixi scene properties from the Helios subscription loop.

## Quick Start

```typescript
import { Helios } from '@helios-project/core';
import { Application, Graphics } from 'pixi.js';

// 1. Initialize Pixi
const app = new Application();
await app.init({ resizeTo: window });
document.body.appendChild(app.canvas);

// 2. Initialize Helios
const helios = new Helios({ fps: 30, duration: 5 });

// 3. Create Scene
const rect = new Graphics().rect(0, 0, 100, 100).fill(0xff0000);
rect.pivot.set(50, 50);
rect.position.set(app.screen.width / 2, app.screen.height / 2);
app.stage.addChild(rect);

// 4. Bind Timeline (Crucial for Renderer)
helios.bindToDocumentTimeline();

// 5. Drive Animation
helios.subscribe((state) => {
  const t = state.currentTime;

  // Update properties based on time
  rect.rotation = t * 1.5;
  rect.x = (app.screen.width / 2) + Math.sin(t) * 100;
});
```

## Key Patterns

### Bind to Document Timeline

PixiJS and other WebGL libraries often have their own internal tickers. To ensure frame-perfect rendering during export (via `Renderer`), you must bind Helios to the `document.timeline`.

```typescript
helios.bindToDocumentTimeline();
```

This allows the `Renderer` (via `CdpTimeDriver`) to control the global clock, which PixiJS respects if properly synchronized.

### Disable Internal Ticker (Optional but Recommended)

If you are strictly driving the scene via `helios.subscribe()`, you might not need Pixi's internal ticker for animation logic, though Pixi still needs to render. The standard pattern is to let Pixi render naturally but update *state* in the Helios subscriber.

## Source Files

- Example: `examples/pixi-canvas-animation/`
