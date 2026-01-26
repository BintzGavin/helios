---
name: helios-player
description: Player API for embedding Helios compositions in web pages. Use when you need to display a composition with playback controls or enable client-side exporting.
---

# Helios Player API

The `<helios-player>` Web Component allows you to embed and control Helios compositions in any web application. It handles loading the composition in an iframe and establishing a bridge for control and state management.

## Quick Start

```html
<script type="module" src="path/to/@helios-project/player/dist/index.js"></script>

<helios-player
  src="composition.html"
  width="1280"
  height="720"
  controls
  autoplay
></helios-player>
```

## API Reference

### HTML Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `src` | string | URL of the composition (must contain Helios logic) |
| `width` | number | Display width (maintains aspect ratio if height also set) |
| `height` | number | Display height |
| `controls` | boolean | Show built-in playback controls |
| `autoplay` | boolean | Start playing immediately when ready |
| `loop` | boolean | Loop playback when finished |
| `export-mode` | 'auto' \| 'canvas' \| 'dom' | Strategy for client-side export (default: 'auto') |
| `canvas-selector`| string | CSS selector for the canvas element (default: 'canvas') |

### JavaScript API

To control the player programmatically, obtain a reference to the element and use `getController()`.

```typescript
const player = document.querySelector('helios-player');
const controller = player.getController();

if (controller) {
  controller.play();
  controller.seek(100);
  controller.setPlaybackRate(1.5);
}
```

#### HeliosController Interface

```typescript
interface HeliosController {
  play(): void;
  pause(): void;
  seek(frame: number): void;
  setPlaybackRate(rate: number): void;
  getState(): HeliosState;
  subscribe(callback: (state: HeliosState) => void): () => void;
}
```

## Client-Side Export

The player supports exporting videos directly in the browser (using `VideoEncoder` and `mp4-muxer`).

1. Ensure your composition uses `canvas` rendering if using `export-mode="canvas"` (recommended for performance).
2. The user can click the "Export" button in the default controls.
3. Or trigger programmatically (via UI interaction logic you implement that calls internal export methods - currently primarily via UI).

## Styling & Customization

The player uses Shadow DOM. You can style certain parts if exposed via `::part()`, but general layout is encapsulated.

- **Status Overlay:** The player has a status overlay (`.status-overlay`) that shows connection status and errors.
- **Controls:** The controls bar is accessible via Shadow DOM inspection but not explicitly customizable via API yet.

## Common Issues

- **Cross-Origin (CORS):** The player uses an `iframe`. If the `src` is on a different origin, you might encounter restrictions. Ensure CORS headers are set correctly if cross-origin.
- **Connection Failed:** If you see "Connection Failed", ensure `window.helios` is exposed in your composition so the player can find it (Direct Mode) or that the composition is correctly handling window messages (Bridge Mode).

## Source Files

- Component: `packages/player/src/index.ts`
- Controller: `packages/player/src/controllers/`
