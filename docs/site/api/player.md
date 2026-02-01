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
  input-props='{"title":"Hello World"}'
></helios-player>
```

### Attributes

- **`src`** (string): URL of the composition.
- **`width`** (number): Width of the player in pixels.
- **`height`** (number): Height of the player in pixels.
- **`controls`** (boolean): If present, displays the playback controls (play/pause, scrubber, speed, export, CC).
- **`autoplay`** (boolean): If present, starts playback automatically.
- **`loop`** (boolean): If present, loops playback.
- **`muted`** (boolean): If present, initializes the player in muted state.
- **`poster`** (string): URL of an image to show before playback starts.
- **`export-mode`** (string): `'auto'`, `'canvas'`, or `'dom'`. Determines how frames are captured for client-side export.
- **`export-format`** (string): `'mp4'` (default) or `'webm'`. The output video format.
- **`export-caption-mode`** (string): `'burn-in'` (default) or `'file'`. If `'file'`, exports a sidecar `.srt` file instead of burning captions into the video.
- **`canvas-selector`** (string): CSS selector for the canvas element (required for `export-mode="canvas"`).
- **`input-props`** (string): JSON string of input properties to pass to the composition.
- **`sandbox`** (string): Sandbox flags for the iframe (default: `'allow-scripts allow-same-origin'`).
- **`controlslist`** (string): Space-separated list of features to disable (e.g., `'nodownload nofullscreen'`).
- **`interactive`** (boolean): If present, disables the click-layer to allow direct interaction with the iframe content.

### Standard Media API

The `<helios-player>` element implements a subset of the HTMLMediaElement API, allowing programmatic control similar to a `<video>` element.

#### Properties
- **`currentTime`** (number): Current playback time in seconds. Can be set to seek.
- **`duration`** (number, readonly): Total duration in seconds.
- **`paused`** (boolean, readonly): Whether playback is paused.
- **`ended`** (boolean, readonly): Whether playback has reached the end.
- **`volume`** (number): Audio volume (0.0 - 1.0).
- **`muted`** (boolean): Audio muted state.
- **`playbackRate`** (number): Playback speed multiplier.
- **`fps`** (number, readonly): The composition's frame rate.
- **`currentFrame`** (number): Current frame index. Can be set to seek by frame.
- **`videoWidth`** (number, readonly): The width of the video in pixels.
- **`videoHeight`** (number, readonly): The height of the video in pixels.
- **`buffered`** (TimeRanges, readonly): The buffered time ranges.
- **`seekable`** (TimeRanges, readonly): The seekable time ranges.
- **`seeking`** (boolean, readonly): Whether the player is currently seeking.
- **`playing`** (boolean, readonly): Whether the media is playing.
- **`readyState`** (number, readonly): The current readiness state of the media.
- **`networkState`** (number, readonly): The current network state of the media.
- **`textTracks`** (TextTrackList, readonly): List of text tracks (captions).

#### Methods
- **`play()`**: Starts playback. Returns a Promise.
- **`pause()`**: Pauses playback.
- **`addTextTrack(kind, label, language)`**: Adds a new text track to the player.
- **`seekToMarker(id)`**: Seeks to the marker with the specified ID.
- **`requestPictureInPicture()`**: Requests Picture-in-Picture mode for the video. Returns a Promise resolving to the PiP Window.

### Visual Markers

You can visualize markers on the timeline scrubber by passing a `markers` array in the `HeliosOptions` (or via `setMarkers`). The player renders these as interactive points on the timeline. Hovering over the scrubber also displays a tooltip with the precise timestamp.

### Client-Side Export

The player supports client-side video export (rendering to WebM/MP4 in the browser).
- Users can click the "Export" button in the UI.
- Supports canceling the export.
- Locks the UI during export.
- Supports audio export via OfflineAudioContext.
- Supports "Burn-In" captions during export.

#### `ClientSideExporter`

You can also access the exporter programmatically.

```typescript
import { ClientSideExporter } from '@helios-project/player';

const player = document.querySelector('helios-player');
const controller = player.getController();

if (controller) {
  const exporter = new ClientSideExporter(controller, player.shadowRoot.querySelector('iframe'));

  await exporter.export({
    format: 'mp4',
    mode: 'auto',
    onProgress: (p) => console.log(p),
    includeCaptions: true
  });
}
```

### Keyboard Shortcuts

- **Space / K**: Toggle Play/Pause.
- **F**: Toggle Fullscreen.
- **Arrow Left / Right**: Seek -1 / +1 frame (hold Shift for 10 frames).
- **J / L**: Seek -1 / +1 frame (hold Shift for 10 frames).
- **. / ,**: Step forward / backward 1 frame.
- **I**: Set "In" point (Loop Start).
- **O**: Set "Out" point (Loop End).
- **X**: Clear Loop Range.
- **M**: Toggle Mute.

### Accessibility

The player implements ARIA attributes for accessibility:
- `role="toolbar"` for controls.
- `aria-label` for buttons.
- `aria-valuenow` and `aria-valuetext` for the scrubber.

### Programmatic Control (Controller)

You can also access the internal controller for advanced usage (though the Standard Media API on the element itself is preferred for basic control).

```typescript
const player = document.querySelector('helios-player');
const controller = player.getController();

if (controller) {
  controller.setInputProps({ newProp: 'value' });

  // Audio Track Control
  controller.setAudioTrackVolume('my-music-track', 0.5);
  controller.setAudioTrackMuted('my-sfx-track', true);
}
```
