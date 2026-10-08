---
name: create-composition
description: Workflow for creating a new Helios composition. Use when building a new animation project or converting an existing animation to run in Helios.
---

# Create Composition Workflow

A Helios composition is a web page (HTML/JS) that uses the `@helios-project/core` library to drive animations. This page can be viewed in the Browser, embedded in the Player, or rendered to video by the Renderer.

## 1. Basic Structure

Create a `composition.html` file. This is the entry point.

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Composition</title>
    <style>
        body { margin: 0; overflow: hidden; background: black; }
        canvas { display: block; width: 100vw; height: 100vh; }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <script type="module" src="./src/main.ts"></script>
</body>
</html>
```

## 2. Initialize Helios

In your script (`main.ts` or inline), initialize Helios and set up the render loop.

```typescript
import { Helios } from '@helios-project/core';

// 1. Config
const width = 1920;
const height = 1080;
const fps = 30;
const duration = 10; // seconds

// 2. Define Input Schema (Optional but recommended)
const schema = {
  type: 'object',
  properties: {
    title: { type: 'string', default: "Hello World" },
    color: { type: 'string', default: "#ff0000" }
  }
};

// 3. Setup Canvas
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d');

// 4. Initialize Engine
const helios = new Helios({
    duration,
    fps,
    width,
    height,
    schema, // Pass schema
    inputProps: { title: "Hello World", color: "#ff0000" }, // Initial props
    autoSyncAnimations: true // Optional: Sync CSS/WAAPI
});

// 5. Bind to Document Timeline (CRITICAL for Renderer/Player)
helios.bindToDocumentTimeline();

// 6. Expose to Window (CRITICAL for detection)
// @ts-ignore
window.helios = helios;

// 7. Define Render Function
function draw(frame: number, props: any) {
    // Clear
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // Calculate time/progress
    const time = frame / fps;
    const progress = time / duration;

    // Draw something using props
    const x = progress * width;

    ctx.fillStyle = props.color;
    ctx.font = '100px sans-serif';
    ctx.fillText(props.title, x, height/2);
}

// 8. Subscribe to State Changes
helios.subscribe((state) => {
    draw(state.currentFrame, state.inputProps);
});

// 9. Initial Draw
const state = helios.getState();
draw(state.currentFrame, state.inputProps);
```

## Checklist

- [ ] **Instance Created:** `new Helios(...)` called with duration/fps/props.
- [ ] **Timeline Bound:** `helios.bindToDocumentTimeline()` called.
- [ ] **Window Exposed:** `window.helios = helios` set.
- [ ] **State Subscribed:** `helios.subscribe(...)` used to trigger renders.
- [ ] **Canvas/DOM Ready:** Elements are sized correctly (usually 100vw/100vh or fixed resolution).

## Auto-Sync Animations

If you are using CSS animations or Web Animations API (WAAPI), set `autoSyncAnimations: true` in the constructor. Helios will automatically hijack the document timeline and sync these animations to the current frame when scrubbing.

## Frameworks

For React, Vue, or Svelte, wrap this logic in a component or hook.
See `examples/react/SKILL.md`, `examples/vue/SKILL.md`, or `examples/svelte/SKILL.md`.
