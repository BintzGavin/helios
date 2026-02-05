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
| `export-format` | Output format: `mp4`, `webm`, `png`, or `jpeg`. | `mp4` |
| `poster` | URL of an image to display before playback starts. | - |
| `preload` | `auto` or `none`. If `none`, defers loading the iframe until interaction. | `auto` |
| `input-props` | JSON string of properties to pass to the composition. | - |
| `interactive` | Enable direct interaction with the composition (disables click-to-pause). | `false` |
| `controlslist` | Space-separated list of features to disable: `nodownload`, `nofullscreen`. | - |
| `sandbox` | Security flags for the iframe. | `allow-scripts allow-same-origin` |
| `export-width` | Target width for client-side export. | - |
| `export-height` | Target height for client-side export. | - |
| `export-bitrate` | Target bitrate for client-side export (bps). | - |
| `export-filename` | Filename for client-side export (without extension). | `video` |
| `export-caption-mode` | Strategy for caption export: `burn-in` or `file`. | `burn-in` |
| `disablepictureinpicture` | Hides the Picture-in-Picture button. | `false` |
| `media-title` | Title of the composition for OS Media Session. | - |
| `media-artist` | Artist name for OS Media Session. | - |
| `media-album` | Album name for OS Media Session. | - |
| `media-artwork` | URL of artwork for OS Media Session (defaults to poster). | - |

## User Interface

The player includes a comprehensive set of controls:

- **Playback**: Play/Pause, Scrubber, Time Display.
- **Audio**: Volume, Mute, and a Track Menu for individual track control.
- **Settings Menu** (Gear Icon):
  - **Speed**: Adjust playback rate (0.25x - 2x).
  - **Loop**: Toggle playback looping.
  - **Playback Range**: Set In/Out points to loop a specific section.
  - **Diagnostics**: View environment capabilities (WebCodecs support).
  - **Shortcuts**: View keyboard shortcuts.
- **Tools**: Fullscreen, Picture-in-Picture, Captions (CC), Export.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `K` | Play / Pause |
| `F` | Toggle Fullscreen |
| `M` | Mute / Unmute |
| `C` | Toggle Captions |
| `?` | Show Shortcuts Help |
| `←` / `→` | Seek 1 frame |
| `Shift` + `←` / `→` | Seek 10 frames |
| `Home` | Go to Start |
| `End` | Go to End |
| `I` | Set In Point |
| `O` | Set Out Point |
| `X` | Clear Playback Range |
| `Shift` + `D` | Toggle Diagnostics |
| `0-9` | Seek to 0-90% |

## CSS Variables

The player exposes several CSS variables to allow theming of the controls:

| Variable | Default | Description |
|---|---|---|
| `--helios-controls-bg` | `rgba(0, 0, 0, 0.6)` | Background color of the controls bar. |
| `--helios-text-color` | `white` | Text and icon color. |
| `--helios-accent-color` | `#007bff` | Accent color for active elements (scrubber, buttons). |
| `--helios-range-track-color` | `#555` | Background color of the scrubber track. |
| `--helios-font-family` | `sans-serif` | Font family for the player UI. |

## Standard Media API

The `<helios-player>` element implements a subset of the HTMLMediaElement interface, allowing you to control playback programmatically.

### Methods

- `play(): Promise<void>` - Starts playback.
- `pause(): void` - Pauses playback.
- `load(): void` - Reloads the iframe (useful if `src` changed or to retry connection).
- `addTextTrack(kind: string, label?: string, language?: string): TextTrack` - Adds a new text track to the media element.
- `diagnose(): Promise<DiagnosticReport>` - Runs environment diagnostics (WebCodecs, WebGL) and returns a report.
- `requestPictureInPicture(): Promise<PictureInPictureWindow>` - Requests Picture-in-Picture mode for the player.
- `export(options?: HeliosExportOptions): Promise<void>` - Programmatically trigger client-side export.

### Properties

- `textTracks` (TextTrackList, read-only): The text tracks associated with the media element.
- `currentTime` (number): Current playback position in seconds.
- `duration` (number, read-only): Total duration in seconds.
- `paused` (boolean, read-only): Whether playback is paused.
- `ended` (boolean, read-only): Whether playback has reached the end.
- `volume` (number): Audio volume (0.0 to 1.0).
- `muted` (boolean): Audio mute state.
- `playbackRate` (number): Playback speed (default 1.0).
- `videoWidth` (number, read-only): The intrinsic width of the video (from controller state or attributes).
- `videoHeight` (number, read-only): The intrinsic height of the video (from controller state or attributes).
- `buffered` (TimeRanges, read-only): Returns a TimeRanges object representing buffered content (always 0-duration).
- `seekable` (TimeRanges, read-only): Returns a TimeRanges object representing seekable content (always 0-duration).
- `seeking` (boolean, read-only): Whether the player is currently seeking (scrubbing).
- `readyState` (number, read-only): The current readiness state of the media (0-4).
- `networkState` (number, read-only): The current network state (0-3).
- `fps` (number, read-only): Frames per second of the composition.
- `currentFrame` (number): Current frame index.
- `inputProps` (object): Get or set the input properties passed to the composition.
- `disablePictureInPicture` (boolean): Hides the Picture-in-Picture button.

## Events

The element dispatches the following custom events:

- `play`: Fired when playback starts.
- `pause`: Fired when playback is paused.
- `ended`: Fired when playback completes.
- `timeupdate`: Fired when the current time/frame changes.
- `volumechange`: Fired when volume or mute state changes.
- `ratechange`: Fired when playback rate changes.
- `durationchange`: Fired when the duration of the composition changes.
- `loadstart`: Fired when the browser begins looking for media data.
- `loadedmetadata`: Fired when the duration and dimensions of the media have been determined.
- `loadeddata`: Fired when data for the current frame is available.
- `canplay`: Fired when the browser can resume playback of the media.
- `canplaythrough`: Fired when the browser estimates it can play through the media without buffering.

## Client-Side Export

The player supports exporting the composition to video (MP4/WebM) or image snapshots (PNG/JPEG) directly in the browser using WebCodecs.

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

To take a snapshot (PNG) instead of a video, set `export-format="png"`.

### Audio Fades

To apply audio fades during client-side export, add `data-helios-fade-in` and/or `data-helios-fade-out` attributes to your audio elements within the composition. The value should be the duration in seconds.

```html
<audio src="music.mp3" data-helios-fade-in="2" data-helios-fade-out="3"></audio>
```

## Verification

To run the End-to-End (E2E) verification suite:

```bash
npx tsx tests/e2e/verify-player.ts
```

This script starts a local server and uses Playwright to verify the player's core functionality (playback, scrubber, menus, volume) using a dependency-free mock composition.
