---
title: "Using the Player"
description: "Embedding and controlling the Helios Player."
---

# Using the Player

The `<helios-player>` component is the standard way to embed compositions in a web page. It handles:

- Loading the composition in a sandboxed iframe.
- establishing a communication bridge.
- Providing playback controls (Play/Pause, Seek, Speed).
- Handling frame export (Canvas or DOM).

## Basic Embedding

```html
<script type="module" src="https://unpkg.com/@helios-project/player/dist/helios-player.js"></script>

<helios-player
  src="./composition.html"
  width="800"
  height="450"
  controls
></helios-player>
```

## Controlling Programmatically

You can grab the element reference and call methods on it.

```javascript
const player = document.querySelector('helios-player');

// Wait for it to be ready (optional, but good practice)
player.addEventListener('helios:ready', () => {
  console.log('Player is ready');
  player.play();
});

// Control
document.getElementById('play-btn').onclick = () => player.play();
document.getElementById('pause-btn').onclick = () => player.pause();
```

## Export Modes

The player supports two export modes for capturing frames (used by the Renderer or for snapshots).

### Canvas Mode (`export-mode="canvas"`)

Best for Canvas/WebGL compositions. Captures the pixels directly from the canvas.

```html
<helios-player
  src="./composition.html"
  export-mode="canvas"
  canvas-selector="#my-canvas"
></helios-player>
```

### DOM Mode (`export-mode="dom"`)

Best for HTML/CSS animations. Uses `XMLSerializer` to serialize the DOM into an SVG and draw it to a canvas.

```html
<helios-player
  src="./composition.html"
  export-mode="dom"
></helios-player>
```
