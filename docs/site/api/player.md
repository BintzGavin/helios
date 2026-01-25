---
title: "Player API"
description: "API Reference for @helios-project/player"
---

# Player API

The `@helios-project/player` package provides the `<helios-player>` web component.

## `<helios-player>`

A web component that embeds a Helios composition (iframe) and provides playback controls.

### Attributes

- **`src`**: Path to the composition file (usually an HTML file).
- **`width`**: Width of the player (pixels).
- **`height`**: Height of the player (pixels).
- **`controls`**: Boolean. Whether to show the UI controls.
- **`autoplay`**: Boolean. Whether to start playing automatically.
- **`loop`**: Boolean. Whether to loop playback.
- **`export-mode`**: String. Controls how frames are captured ('canvas' | 'dom').
- **`canvas-selector`**: String. CSS selector for the canvas element (if using 'canvas' mode).

### Example

```html
<helios-player
  src="./composition.html"
  width="800"
  height="600"
  controls
  autoplay
  loop
></helios-player>
```

### Methods

The element instance exposes methods to control the player programmatically.

```javascript
const player = document.querySelector('helios-player');

// Play/Pause
player.play();
player.pause();

// Seek
player.seek(100); // Frame 100

// Set Speed
player.setPlaybackRate(2.0);
```
