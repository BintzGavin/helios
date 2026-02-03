---
name: helios-player
description: Player API for embedding Helios compositions in web pages. Use when you need to display a composition with playback controls, enable client-side exporting, or support Picture-in-Picture.
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
| `controlslist` | string | Space-separated list of features to hide: `nodownload`, `nofullscreen` |
| `autoplay` | boolean | Start playing immediately when ready |
| `loop` | boolean | Loop playback when finished |
| `muted` | boolean | Mute audio initially |
| `poster` | string | URL of an image to show before playback |
| `preload` | 'auto' \| 'none' | Preload behavior (default: 'auto') |
| `interactive`| boolean | Allow direct interaction with the iframe content (disables overlay) |
| `input-props` | JSON string | Pass initial properties to the composition |
| `export-mode` | 'auto' \| 'canvas' \| 'dom' | Strategy for client-side export (default: 'auto') |
| `export-format` | 'mp4' \| 'webm' | Output format for client-side export (default: 'mp4') |
| `export-caption-mode` | 'burn-in' \| 'file' | How to handle captions during export (default: 'burn-in') |
| `export-width` | number | Width of the exported video (independent of display width) |
| `export-height` | number | Height of the exported video |
| `export-bitrate` | number | Target bitrate for export (bits/s) |
| `export-filename` | string | Filename for export (default: 'video') |
| `disablepictureinpicture` | boolean | Disable the Picture-in-Picture button |
| `canvas-selector`| string | CSS selector for the canvas element (default: 'canvas') |
| `sandbox` | string | Iframe sandbox flags (default: 'allow-scripts allow-same-origin') |

### CSS Variables (Theming)

You can customize the player's appearance using CSS variables:

```css
helios-player {
  --helios-controls-bg: rgba(0, 0, 0, 0.8);
  --helios-text-color: #ffffff;
  --helios-accent-color: #ff0000;
  --helios-range-track-color: #555555;
  --helios-range-selected-color: rgba(255, 255, 255, 0.5);
  --helios-font-family: 'Helvetica', sans-serif;
}
```

### JavaScript API

The element implements a Standard Media API-like interface for easy integration with video wrappers.

```typescript
const player = document.querySelector('helios-player');

// Playback Control
player.play();
player.pause();
player.load();
player.requestPictureInPicture(); // Enter PiP mode
player.currentTime = 5.0; // Seek to 5 seconds
player.currentFrame = 150; // Seek to frame 150

// Audio Control
player.volume = 0.5; // 0.0 to 1.0
player.muted = true;

// Writable Properties
console.log(player.duration);     // Total duration in seconds
console.log(player.paused);       // Boolean
console.log(player.playbackRate); // Speed multiplier
console.log(player.fps);          // Composition FPS
console.log(player.loop);         // Loop state
console.log(player.autoplay);     // Autoplay state

// Read-Only Properties
console.log(player.videoWidth);   // Intrinsic width
console.log(player.videoHeight);  // Intrinsic height
console.log(player.readyState);   // 0-4 (HAVE_NOTHING to HAVE_ENOUGH_DATA)
console.log(player.networkState); // 0-3 (EMPTY, IDLE, LOADING, NO_SOURCE)
console.log(player.seeking);      // Boolean (true while scrubbing)
console.log(player.played);       // TimeRanges object of played segments
console.log(player.buffered);     // TimeRanges object of buffered segments
console.log(player.seekable);     // TimeRanges object of seekable segments
console.log(player.error);        // MediaError object if failed

// Input Props
player.inputProps = { title: "Updated Title" };

// Text Tracks
console.log(player.textTracks);
const track = player.addTextTrack("captions", "English", "en");

// Access active cues
track.addEventListener("cuechange", () => {
  console.log("Active Cues:", track.activeCues);
});
```

#### Events
The player dispatches standard media events:
- `loadstart`, `loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`
- `play`, `pause`, `ended`, `playing`
- `timeupdate`, `seeking`, `seeked`
- `volumechange`
- `durationchange`, `ratechange`
- `error`

#### Advanced Control
For low-level access to the Helios state, use `getController()`.

```typescript
const controller = player.getController();

if (controller) {
  const state = controller.getState();

  // Dynamic Updates
  controller.setDuration(30);       // Update duration to 30s
  controller.setFps(60);            // Update FPS to 60
  controller.setSize(1080, 1080);   // Update resolution
  controller.setMarkers([{ id: "m1", time: 5, label: "Intro" }]);
}
```

#### Diagnostics
View environment capabilities (WebCodecs, WebGL) by pressing **Shift+D** to toggle the overlay, or calling `diagnose()` programmatically.

```typescript
const report = await player.diagnose();
console.log("WebCodecs support:", report.webCodecs);
```

#### Captions
You can provide captions by adding a `<track>` element as a child.

```html
<helios-player src="...">
  <track kind="captions" src="captions.srt" default>
</helios-player>
```
The player will fetch the SRT file and pass it to the Helios controller.

## Client-Side Export

The player supports exporting videos directly in the browser (using `VideoEncoder`).

1. **Formats:** Supports `mp4` (H.264/AAC) and `webm` (VP9/Opus).
2. **Audio:** Captures audio from `<audio>` elements (must be CORS-enabled).
3. **Captions:** Supports "burning in" captions (`export-caption-mode="burn-in"`) or saving as sidecar file (`export-caption-mode="file"`).
4. **Resolution:** Configure export resolution independently of player size using `export-width` and `export-height`.
5. **Usage:** User clicks "Export" in controls, or call `clientSideExporter` manually (internal API).

## UI Features

- **Captions:** Toggle "CC" button to overlay active captions.
- **Volume:** Slider and Mute toggle.
- **Speed:** Selector for playback rate (0.25x - 2x).
- **Fullscreen:** Toggle fullscreen mode.
- **Scrubber:** Visual playback range indication.
- **Responsive:** Controls adapt to small widths (compact/tiny modes).

## Common Issues

- **Cross-Origin (CORS):** The player uses an `iframe`. If the `src` is on a different origin, ensure CORS headers are set.
- **Audio Export:** Audio elements must serve data with `Access-Control-Allow-Origin` to be captured by the exporter.

## Source Files

- Component: `packages/player/src/index.ts`
- Exporter: `packages/player/src/features/exporter.ts`
