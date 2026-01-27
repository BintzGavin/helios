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
  input-props='{"title": "My Video"}'
></helios-player>
```

## API Reference

### HTML Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `src` | string | URL of the composition (must contain Helios logic) |
| `width` | number | Display width (maintains aspect ratio if height also set) |
| `height` | number | Display height |
| `controls` | boolean | Show built-in playback controls (Play, Volume, Captions, Export) |
| `autoplay` | boolean | Start playing immediately when ready |
| `loop` | boolean | Loop playback when finished |
| `input-props` | JSON string | Pass initial properties to the composition |
| `export-mode` | 'auto' \| 'canvas' \| 'dom' | Strategy for client-side export (default: 'auto') |
| `export-format` | 'mp4' \| 'webm' | Output format for client-side export (default: 'mp4') |
| `canvas-selector`| string | CSS selector for the canvas element (default: 'canvas') |

### JavaScript API

The element implements a Standard Media API-like interface for easy integration.

```typescript
const player = document.querySelector('helios-player');

// Playback Control
player.play();
player.pause();
player.currentTime = 5.0; // Seek to 5 seconds
player.currentFrame = 150; // Seek to frame 150

// Audio Control
player.volume = 0.5; // 0.0 to 1.0
player.muted = true;

// Properties
console.log(player.duration);     // Total duration in seconds
console.log(player.paused);       // Boolean
console.log(player.playbackRate); // Speed multiplier
console.log(player.fps);          // Composition FPS

// Input Props
player.inputProps = { title: "Updated Title" };
```

#### Events
The player dispatches standard media events:
- `play`, `pause`, `ended`
- `timeupdate`
- `volumechange`
- `durationchange`, `ratechange`

#### Advanced Control
For low-level access to the Helios state, use `getController()`.

```typescript
const controller = player.getController();

if (controller) {
  const state = controller.getState();
  console.log("Active Captions:", state.activeCaptions);
}
```

## Client-Side Export

The player supports exporting videos directly in the browser (using `VideoEncoder`).

1. **Formats:** Supports `mp4` (H.264/AAC) and `webm` (VP9/Opus).
2. **Audio:** Captures audio from `<audio>` elements (must be CORS-enabled).
3. **Captions:** Supports "burning in" captions if they are active.
4. **Usage:** User clicks "Export" in controls, or via custom logic.

## UI Features

- **Captions:** Toggle "CC" button to overlay active captions.
- **Volume:** Slider and Mute toggle.
- **Speed:** Selector for playback rate (0.25x - 2x).
- **Fullscreen:** Toggle fullscreen mode.

## Common Issues

- **Cross-Origin (CORS):** The player uses an `iframe`. If the `src` is on a different origin, ensure CORS headers are set.
- **Audio Export:** Audio elements must serve data with `Access-Control-Allow-Origin` to be captured by the exporter.

## Source Files

- Component: `packages/player/src/index.ts`
- Exporter: `packages/player/src/features/exporter.ts`
