---
name: example-vanilla
description: Patterns for using Helios with Vanilla JavaScript/TypeScript. Use when building compositions without a framework, or for simple DOM/Canvas manipulations.
---

# Vanilla JS Composition Patterns

Integrate Helios into standard HTML/JS applications using direct DOM manipulation and subscriptions.

## Quick Start

### 1. Setup

Initialize Helios and bind to the document timeline.

```typescript
import { Helios } from '@helios-project/core';

// 1. Initialize Helios
const helios = new Helios({
  duration: 10,
  fps: 30,
  width: 1920,
  height: 1080,
  autoSyncAnimations: true // Sync WAAPI/CSS animations
});

// 2. Expose for Player/Studio
(window as any).helios = helios;

// 3. Bind to external timeline (important for Renderer/Studio)
helios.bindToDocumentTimeline();
```

### 2. Subscribe to Updates

Use `subscribe` to update the DOM or Canvas on every frame.

```typescript
const box = document.getElementById('box');

helios.subscribe((state) => {
  if (!box) return;

  const { currentFrame, fps } = state;
  const time = currentFrame / fps;

  // Animate based on time
  const x = time * 100;
  box.style.transform = `translateX(${x}px)`;

  // Update text
  box.textContent = `Frame: ${currentFrame}`;
});
```

### 3. Captions Example

Driven by SRT content.

```typescript
const captionBox = document.getElementById('captions');

helios.subscribe((state) => {
  if (!captionBox) return;

  const activeCues = state.activeCaptions;

  if (activeCues.length > 0) {
    captionBox.innerText = activeCues.map(c => c.text).join('\n');
    captionBox.style.opacity = '1';
  } else {
    captionBox.innerText = '';
    captionBox.style.opacity = '0';
  }
});
```

## Key Concepts

- **Direct DOM Manipulation:** Use `style.transform`, `textContent`, etc., inside the `subscribe` callback.
- **`bindToDocumentTimeline`:** Crucial for allowing the `HeliosPlayer` or `Renderer` to drive the animation.
- **Performance:** Avoid expensive layout thrashing (reading offsets then writing styles) inside the loop.

## Source Files

- Example: `examples/vanilla-captions-animation/`
- Example: `examples/simple-canvas-animation/`
