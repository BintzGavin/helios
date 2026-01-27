# Context: PLAYER

## Overview
The `@helios-project/player` package provides the `<helios-player>` Web Component, a drop-in UI for reviewing and exporting Helios compositions. It bridges the gap between the raw composition (in an iframe) and the user, providing playback controls, timeline scrubbing, and client-side export capabilities.

## Architecture
- **Web Component**: `<helios-player>` (Shadow DOM)
- **Controller**: `HeliosController` (Interface for `DirectController` and `BridgeController`)
- **Exporter**: `ClientSideExporter` (WebCodecs-based export, supports Canvas/DOM modes, MP4/WebM formats, and audio mixing with volume control)
- **Bridge**: `postMessage` protocol for cross-origin communication

## Component Structure
The Shadow DOM consists of:
- **Overlay**: Status messages ("Connecting...", "Error") and retry button.
- **Iframe**: The composition container (`sandbox="allow-scripts allow-same-origin"`).
- **Captions**: Overlay container for rendering active captions.
- **Controls**:
  - Play/Pause button
  - Volume/Mute controls
  - CC (Captions) toggle
  - Export button (cancels during export)
  - Speed selector (0.25x - 2x)
  - Scrubber (range input)
  - Time display (Current / Total)
  - Fullscreen toggle

## Events
The component dispatches standard HTML5 Media Events:
- `play`: Playback started.
- `pause`: Playback paused.
- `ended`: Playback reached the end.
- `timeupdate`: Current frame changed.
- `volumechange`: Volume or mute state changed.
- `ratechange`: Playback rate changed.
- `durationchange`: Duration changed.

## Attributes
| Attribute | Description | Default |
|---|---|---|
| `src` | URL of the composition page. | (Required) |
| `width` | Width for aspect ratio. | - |
| `height` | Height for aspect ratio. | - |
| `autoplay` | Auto-play on connect. | `false` |
| `loop` | Loop playback. | `false` |
| `controls` | Show UI controls. | `false` |
| `export-mode` | Export strategy (`auto`, `canvas`, `dom`). | `auto` |
| `canvas-selector`| CSS selector for canvas capture. | `canvas` |
| `export-format` | Export format (`mp4`, `webm`). | `mp4` |

## Public API
The `<helios-player>` element exposes the following properties:
- `currentTime` (number): Current playback time in seconds.
- `duration` (readonly number): Total duration in seconds.
- `paused` (readonly boolean): Whether playback is paused.
- `ended` (readonly boolean): Whether playback has finished.
- `volume` (number): Audio volume (0.0 - 1.0).
- `muted` (boolean): Audio mute state.
- `playbackRate` (number): Playback speed.
- `currentFrame` (number): Current frame index.
- `fps` (readonly number): Frames per second.

Methods:
- `play()`: Promise<void>
- `pause()`: void
- `getController()`: HeliosController | null
