# Helios Player

The `@helios-project/player` package provides the `<helios-player>` Web Component, a drop-in UI for reviewing and exporting Helios compositions.

## Installation

```bash
npm install @helios-project/player
```

## Usage

### Host Page

Import the player and use the custom element in your HTML.

```html
<script type="module">
  import "@helios-project/player";
</script>

<helios-player
  src="path/to/composition.html"
  width="1920"
  height="1080"
  controls
  autoplay
></helios-player>
```

### Connecting the Composition

For the player to control your composition, the composition page (inside the iframe) must connect to the parent window.

**If you are using `packages/core` directly:**

```javascript
import { Helios } from "@helios-project/core";
import { connectToParent } from "@helios-project/player/bridge";

const helios = new Helios({ ... });

// Initialize the bridge
connectToParent(helios);
```

**If you are using `window.helios` (Legacy/Direct Mode):**

The player will automatically attempt to access `window.helios` on the iframe's content window if it's on the same origin. However, `connectToParent` is the recommended approach for cross-origin support and sandboxing.

## Attributes

| Attribute | Description | Default |
|---|---|---|
| `src` | URL of the composition page to load in the iframe. | (Required) |
| `width` | Width of the player (aspect ratio calculation). | - |
| `height` | Height of the player (aspect ratio calculation). | - |
| `autoplay` | Automatically start playback when connected. | `false` |
| `loop` | Loop playback when the end is reached. | `false` |
| `controls` | Show the UI controls overlay. | `false` |
| `export-mode` | Strategy for client-side export: `auto`, `canvas`, or `dom`. | `auto` |
| `canvas-selector` | CSS selector for the canvas element (used in `canvas` export mode). | `canvas` |
| `export-format` | Output video format: `mp4` (H.264/AAC) or `webm` (VP9/Opus). | `mp4` |
| `poster` | URL of an image to display before playback starts. | - |
| `preload` | `auto` or `none`. If `none`, defers loading the iframe until interaction. | `auto` |
| `input-props` | JSON string of properties to pass to the composition. | - |
| `interactive` | Enable direct interaction with the composition (disables click-to-pause). | `false` |

## Standard Media API

The `<helios-player>` element implements a subset of the HTMLMediaElement interface, allowing you to control playback programmatically.

### Methods

- `play(): Promise<void>` - Starts playback.
- `pause(): void` - Pauses playback.
- `load(): void` - Reloads the iframe (useful if `src` changed or to retry connection).

### Properties

- `currentTime` (number): Current playback position in seconds.
- `duration` (number, read-only): Total duration in seconds.
- `paused` (boolean, read-only): Whether playback is paused.
- `ended` (boolean, read-only): Whether playback has reached the end.
- `volume` (number): Audio volume (0.0 to 1.0).
- `muted` (boolean): Audio mute state.
- `playbackRate` (number): Playback speed (default 1.0).
- `fps` (number, read-only): Frames per second of the composition.
- `currentFrame` (number): Current frame index.
- `inputProps` (object): Get or set the input properties passed to the composition.

## Events

The element dispatches the following custom events:

- `play`: Fired when playback starts.
- `pause`: Fired when playback is paused.
- `ended`: Fired when playback completes.
- `timeupdate`: Fired when the current time/frame changes.
- `volumechange`: Fired when volume or mute state changes.
- `ratechange`: Fired when playback rate changes.
- `durationchange`: Fired when the duration of the composition changes.

## Client-Side Export

The player supports exporting the composition to video (MP4/WebM) directly in the browser using WebCodecs.

- **`export-mode="canvas"`**: captures frames from a `<canvas>` element. Fast and efficient.
- **`export-mode="dom"`**: captures the entire DOM using `foreignObject` SVG serialization. Useful for compositions using DOM elements (divs, text, css).
- **`export-mode="auto"`**: attempts to detect the best strategy.

Configuration:

```html
<helios-player
  src="..."
  export-mode="dom"
  export-format="webm"
></helios-player>
```
