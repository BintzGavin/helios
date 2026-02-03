# PLAYER Domain Context

## Identity
- **Domain**: `packages/player`
- **Role**: Frontend / Player Agent
- **Responsibility**: `<helios-player>` Web Component, UI controls, iframe bridge.

## Component Structure
The `<helios-player>` uses a Shadow DOM for encapsulation:
- **Wrapper**: Container for layout.
- **Iframe**: Sandboxed iframe loading the Helios composition.
- **Controls Overlay**:
  - Play/Pause, Volume, Mute
  - Scrubber with Time/Duration
  - Playback Speed Selector (0.25x - 2x)
  - Fullscreen Toggle
  - Picture-in-Picture Toggle
  - "CC" Captions Toggle
  - Export Button
- **Diagnostics Overlay**:
  - Toggled via `Shift+D`.
  - Displays JSON report of environment capabilities (WebCodecs, WebGL, etc.).
  - Copy to Clipboard action.
- **Status Overlay**: Displays loading/connection states and errors.
- **Poster**: Initial preview image.

## Public API (Web Component)

### Methods
- `play(): Promise<void>`: Starts playback.
- `pause(): void`: Pauses playback.
- `load(): void`: Reloads the iframe with the current `src`.
- `addTextTrack(kind, label, lang): HeliosTextTrack`: Adds a new text track.
- `requestPictureInPicture(): Promise<PictureInPictureWindow>`: Enters PiP mode.
- `diagnose(): Promise<DiagnosticReport>`: Runs environment diagnostics and returns a report.
- `getController(): HeliosController | null`: Returns the internal controller instance.
- `getSchema(): Promise<HeliosSchema | undefined>`: Returns the composition schema.

### Properties
- `currentTime`: Current playback time in seconds.
- `duration`: Total duration in seconds.
- `paused`: Boolean indicating playback state.
- `ended`: Boolean indicating if playback finished.
- `volume`: Audio volume (0.0 - 1.0).
- `muted`: Audio mute state.
- `playbackRate`: Playback speed (default 1.0).
- `loop`: Boolean for looping playback.
- `src`: URL of the Helios composition.
- `poster`: URL of the poster image.
- `preload`: 'auto' | 'metadata' | 'none'.
- `inputProps`: Object for dynamic composition properties.
- `textTracks`: `HeliosTextTrackList` of available tracks.
- `videoWidth` / `videoHeight`: Intrinsic dimensions.
- `readyState` / `networkState`: Standard HTMLMediaElement states.

### Attributes
- `src`: URL of the composition.
- `width` / `height`: Dimensions.
- `autoplay`: Auto-start playback.
- `loop`: Loop playback.
- `controls`: Show/hide controls.
- `muted`: Initial mute state.
- `poster`: Poster image URL.
- `preload`: Loading strategy.
- `interactive`: Enable direct iframe interaction (disable click-to-play).
- `controlslist`: "nodownload", "nofullscreen" to hide specific controls.
- `sandbox`: Custom iframe sandbox flags.
- `disablepictureinpicture`: Hides the PiP button.
- `export-mode`: "auto" | "canvas" | "dom" (default: "auto").
- `export-format`: "mp4" | "webm" (default: "mp4").
- `export-caption-mode`: "burn-in" | "file" (default: "burn-in").
- `export-width`: Target width for client-side export.
- `export-height`: Target height for client-side export.
- `export-bitrate`: Target bitrate for client-side export (bps).
- `canvas-selector`: CSS selector for canvas in "canvas" mode.
- `input-props`: JSON string for initial props.

## Events
- `play`, `pause`, `ended`: Playback state changes.
- `timeupdate`: Periodic time updates.
- `volumechange`: Volume/mute changes.
- `ratechange`: Playback rate changes.
- `durationchange`: Duration changes.
- `loadstart`, `loadedmetadata`, `canplay`, `canplaythrough`: Lifecycle events.
- `error`: Playback or connection errors.
- `enterpictureinpicture`, `leavepictureinpicture`: PiP state changes.

## Architecture
- **Direct Mode**: When same-origin, accesses `window.helios` directly.
- **Bridge Mode**: When cross-origin, uses `postMessage` protocol.
- **ClientSideExporter**: Handles in-browser rendering using `mediabunny`. Supports audio fades via `data-helios-fade-in` and `data-helios-fade-out` attributes on media elements. Now supports **Headless Audio**: includes audio tracks injected via `availableAudioTracks` metadata, enabling export without DOM elements.
- **Controllers**: `DirectController` and `BridgeController` normalize API access.
