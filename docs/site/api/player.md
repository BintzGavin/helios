---
title: "Player API"
description: "API Reference for @helios-project/player"
---

# Player API

The `@helios-project/player` package provides the `<helios-player>` web component for embedding and interacting with Helios compositions.

## `<helios-player>`

A custom element that embeds a composition (via iframe) and provides a rich playback UI.

### Usage

```html
<script type="module" src="/path/to/helios-player.js"></script>

<helios-player
  src="./composition.html"
  width="800"
  height="450"
  controls
  autoplay
  loop
  export-mode="canvas"
  canvas-selector="#my-canvas"
></helios-player>
```

### Attributes

- **`src`** (string): URL of the composition.
- **`width`** (number): Width of the player in pixels.
- **`height`** (number): Height of the player in pixels.
- **`controls`** (boolean): If present, displays the playback controls (play/pause, scrubber, speed, export).
- **`autoplay`** (boolean): If present, starts playback automatically.
- **`loop`** (boolean): If present, loops playback.
- **`export-mode`** (string): `'auto'`, `'canvas'`, or `'dom'`. Determines how frames are captured for client-side export.
- **`canvas-selector`** (string): CSS selector for the canvas element (required for `export-mode="canvas"`).

### Client-Side Export

The player supports client-side video export (rendering to WebM/MP4 in the browser).
- Users can click the "Export" button in the UI.
- Supports canceling the export.
- Locks the UI during export.
- Supports audio export via OfflineAudioContext.

### Keyboard Shortcuts

- **Space / K**: Toggle Play/Pause.
- **F**: Toggle Fullscreen.
- **Arrow Left / Right**: Seek -1 / +1 frame (hold Shift for 10 frames).
- **J / L**: Seek -1 / +1 frame (hold Shift for 10 frames).
- **. / ,**: Step forward / backward 1 frame.

### Accessibility

The player implements ARIA attributes for accessibility:
- `role="toolbar"` for controls.
- `aria-label` for buttons.
- `aria-valuenow` and `aria-valuetext` for the scrubber.

### Programmatic Control

The `<helios-player>` element does not expose direct playback methods on itself. Instead, you can access the internal controller.

```typescript
const player = document.querySelector('helios-player');
const controller = player.getController();

if (controller) {
  controller.play();
  controller.seek(0);
  controller.setPlaybackRate(2);
}
```
