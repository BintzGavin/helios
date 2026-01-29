# Player Context

## A. Component Structure
The `<helios-player>` component encapsulates a sandboxed `<iframe>` for rendering Helios compositions, overlaid with a UI layer for controls and feedback.

**Shadow DOM Layout:**
- **Status Overlay**: Displays loading states (`Loading...`, `Connecting...`) and error messages with retry actions.
- **Poster Container**: Displays a poster image and "Big Play Button" when `poster` is set or playback hasn't started.
- **Iframe**: Sandboxed (`allow-scripts allow-same-origin`) rendering surface.
- **Click Layer**: Transparent overlay to capture clicks for Play/Pause and Double-Click for Fullscreen. Controlled by `interactive` attribute.
- **Captions Container**: Renders active captions/subtitles.
- **Controls Toolbar**:
  - Play/Pause/Restart button.
  - Volume control (Mute toggle + Slider).
  - CC toggle.
  - Export button (Client-side WebCodecs export).
  - Playback Speed selector (0.25x - 2x).
  - Scrubber (Input range) & Time Display.
  - Fullscreen toggle.

## B. Events
The component dispatches standard HTMLMediaElement events and custom events:
- `loadstart`: Loading process started.
- `loadedmetadata`: Metadata (duration, dimensions) loaded.
- `loadeddata`: First frame ready.
- `canplay`: Ready to play.
- `canplaythrough`: Ready to play without buffering.
- `play`: Playback started.
- `pause`: Playback paused.
- `ended`: Playback finished.
- `timeupdate`: Current time changed.
- `volumechange`: Volume or mute state changed.
- `ratechange`: Playback rate changed.
- `durationchange`: Duration changed.
- `error`: A critical error occurred (details in `event.detail`).

## C. Attributes
Attributes are synchronized with properties and reflect the component state:
- `src` (string): URL of the Helios composition to load.
- `width` (number): Width of the player (aspect ratio calculation).
- `height` (number): Height of the player.
- `autoplay` (boolean): Automatically start playback when ready.
- `loop` (boolean): Loop playback when finished.
- `controls` (boolean): Show/hide the controls toolbar.
- `muted` (boolean): Mute audio initially.
- `poster` (string): URL of an image to show before playback.
- `preload` (string): `auto` (load immediately) or `none` (wait for interaction).
- `interactive` (boolean): If present, disables the Click Layer, allowing direct interaction with the iframe content.
- `input-props` (JSON string): Dynamic data passed to the composition controller.
- `export-format` (string): `mp4` (default) or `webm`.
- `export-mode` (string): `auto`, `canvas`, or `dom` (export strategy hint).
- `canvas-selector` (string): CSS selector for the canvas to export (in `canvas` mode).

## D. Standard Media API
The component implements a subset of the `HTMLMediaElement` interface for compatibility:
- **Properties**: `currentTime`, `duration`, `paused`, `ended`, `volume`, `muted`, `playbackRate`, `readyState`, `networkState`, `videoWidth`, `videoHeight`, `buffered`, `seekable`, `seeking`.
- **Methods**: `play()`, `pause()`, `load()`.
