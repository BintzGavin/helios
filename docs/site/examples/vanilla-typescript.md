---
title: "Vanilla TypeScript Example"
description: "Using Helios with plain TypeScript (no framework)"
---

# Vanilla TypeScript Example

This example demonstrates how to use Helios in a plain TypeScript environment without any UI framework (like React, Vue, or Svelte). This is often the most performant way to create simple compositions or custom integrations.

## Overview

In a vanilla setup, you instantiate the `Helios` class directly and manually update the DOM or Canvas in response to state changes via the `subscribe` method.

## Key Concepts

- **Direct Instantiation**: `new Helios(...)`.
- **Manual Subscription**: Updating `textContent` or `style` properties inside `helios.subscribe()`.
- **Cleanup**: Calling `helios.dispose()` when done.

## Example Code

```typescript
import { Helios } from '@helios-project/core';

// 1. Create the Helios instance
const helios = new Helios({
  duration: 5,
  fps: 30,
  width: 1920,
  height: 1080
});

// 2. Select DOM elements
const timeDisplay = document.getElementById('time-display');
const box = document.getElementById('animated-box');

// 3. Subscribe to updates
helios.subscribe((state) => {
  // Update text
  if (timeDisplay) {
    timeDisplay.textContent = `Frame: ${state.currentFrame} / ${(state.currentFrame / state.fps).toFixed(2)}s`;
  }

  // Animate element
  if (box) {
    const progress = (state.currentFrame / (state.duration * state.fps));
    const x = progress * 1000; // Move 1000px over the duration
    box.style.transform = `translateX(${x}px)`;
  }
});

// 4. Start playback
helios.play();
```

## Project Structure

For a vanilla TypeScript project, you typically need:
- `index.html`: Entry point.
- `src/index.ts`: Your animation logic.
- `vite.config.js`: Build configuration.

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <body>
    <div id="animated-box" style="width: 100px; height: 100px; background: red;"></div>
    <div id="time-display"></div>
    <script type="module" src="/src/index.ts"></script>
  </body>
</html>
```
