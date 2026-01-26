# PLAYER Context

## Identity
- **Role**: Frontend / Player Agent
- **Domain**: `packages/player`
- **Responsibility**: `<helios-player>` Web Component, UI controls, iframe bridge.

## Component Structure
The `<helios-player>` component utilizes Shadow DOM for isolation.
- **Root**: Host element (block display, relative positioning).
- **Status Overlay**: Handles "Connecting...", "Loading...", and Error states (with Retry or Dismiss actions).
- **Iframe**: Sandboxed execution environment for the user's content (`sandbox="allow-scripts allow-same-origin"`).
- **Captions Overlay**: Absolute positioned container for rendering active captions text.
- **Controls Overlay**:
  - Play/Pause / Restart Button
  - Volume Control (Mute Toggle + Slider)
  - CC Button (Toggle Captions)
  - Export / Cancel Button
  - Speed Selector (0.25x - 2x)
  - Scrubber (Input Range)
  - Time Display (Current / Total)
  - Fullscreen Toggle

## Events
The component dispatches the following standard media events to the DOM:
- `play`: Fired when playback starts or resumes.
- `pause`: Fired when playback is paused.
- `ended`: Fired when playback reaches the end of the timeline.
- `timeupdate`: Fired when the current playback time has changed.
- `volumechange`: Fired when volume or muted state has changed.
- `ratechange`: Fired when playback rate has changed.
- `durationchange`: Fired when the duration attribute has been updated.

It also communicates internally via:
- `window.postMessage` (Bridge Protocol)
- `KeyboardEvent` (Shortcuts)

## Public API
The component exposes a subset of the `HTMLMediaElement` interface:
- `currentTime`: (get/set) Current playback time in seconds.
- `currentFrame`: (get/set) Current playback frame (integer).
- `duration`: (get) Total duration in seconds.
- `paused`: (get) Boolean indicating if playback is paused.
- `ended`: (get) Boolean indicating if playback has finished.
- `volume`: (get/set) Audio volume (0.0 - 1.0).
- `muted`: (get/set) Boolean indicating if audio is muted.
- `playbackRate`: (get/set) Playback speed multiplier (default 1.0).
- `fps`: (get) Frames per second.
- `play()`: Promise<void> - Starts playback.
- `pause()`: void - Pauses playback.

## Attributes
The component observes the following attributes:

| Attribute | Type | Description |
|---|---|---|
| `src` | string | URL of the composition to load in the iframe. |
| `width` | number | Width aspect ratio component. |
| `height` | number | Height aspect ratio component. |
| `autoplay` | boolean | If present, starts playback automatically upon connection. |
| `loop` | boolean | If present, restarts playback when the timeline ends. |
| `controls` | boolean | If present, shows the UI controls overlay. |
| `export-mode` | string | `auto` (default), `canvas`, or `dom`. Controls the capture strategy. |
| `canvas-selector`| string | CSS selector for the canvas element (default: `canvas`). Used in `canvas` mode. |
| `export-format` | string | `mp4` (default) or `webm`. Output video format. |

## Keyboard Shortcuts
| Key | Action |
|---|---|
| Space / K | Toggle Play/Pause |
| F | Toggle Fullscreen |
| Right Arrow / L | Seek Forward 1 frame (Shift: 10 frames) |
| Left Arrow / J | Seek Backward 1 frame (Shift: 10 frames) |
| . | Seek Forward 1 frame |
| , | Seek Backward 1 frame |

## Architecture
- **Controllers**: Abstraction layer (`DirectController` vs `BridgeController`) to unify local and cross-origin interaction.
- **Bridge**: Uses `postMessage` for communication. The child page uses `connectToParent(helios)` helper to establish connection.
- **ClientSideExporter**: Modular export logic supporting WebCodecs (VideoEncoder, AudioEncoder) and DOM Snapshotting. Supports MP4 (H.264/AAC) and WebM (VP9/Opus) output.
- **UI Locking**: Prevents race conditions by disabling playback controls and keyboard shortcuts during client-side export.
- **Scrubber Logic**: Manages internal `isScrubbing` state to pause playback during interaction and prevent the update loop from overwriting the scrubber position. Supports both Mouse and Touch events for mobile compatibility.
- **DOM Capture**: Robust implementation using `XMLSerializer`, SVG `<foreignObject>`, and asset inlining (stylesheets, images, backgrounds, CSS `url()` assets, and `<canvas>` snapshots) for high-fidelity HTML exports.
- **Accessibility**: Implements `role="toolbar"` for controls, dynamic `aria-label` updates for playback state, and `aria-valuetext` for scrubber time (seconds).
- **Captions**: Supports rendering of caption cues from `HeliosState.activeCaptions` via a toggleable overlay, ensuring accessibility and feature parity with rendered output.
