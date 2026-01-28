# PLAYER Context

## Identity
- **Role**: Frontend / Player Agent
- **Domain**: `packages/player`
- **Responsibility**: `<helios-player>` Web Component, UI controls, iframe bridge.

## Architecture
The `<helios-player>` uses a robust connection strategy:
- **Direct Mode**: Polls the iframe content for `window.helios` every 100ms (up to 5s) to support asynchronous composition initialization.
- **Bridge Mode**: Simultaneously attempts to connect via `postMessage` for cross-origin or sandboxed scenarios.
- **Controller Pattern**: Abstracts the connection (Direct or Bridge) behind a unified `HeliosController` interface.

## Component Structure
The `<helios-player>` component uses a Shadow DOM with the following structure:
- `.status-overlay`: Displays loading, error, and connection states (hidden by default).
- `.poster-container`: Displays the poster image and a "Big Play Button" for deferred loading.
- `iframe`: The sandboxed iframe that loads the composition.
- `.click-layer`: Transparent overlay that intercepts clicks (standard video behavior) or allows them to pass through (interactive mode).
- `.captions-container`: Overlay for rendering caption cues.
- `.controls`: The playback control bar (Play/Pause, Volume, Captions, Export, Speed, Scrubber, Time, Fullscreen).

## Events
The `<helios-player>` dispatches the following custom events:
- `play`: Fired when playback starts.
- `pause`: Fired when playback pauses.
- `ended`: Fired when playback reaches the end.
- `timeupdate`: Fired when the current frame changes.
- `volumechange`: Fired when volume or mute state changes.
- `ratechange`: Fired when playback rate changes.
- `durationchange`: Fired when the duration changes.
- `error`: Fired when a runtime error occurs in the bridge or iframe.

## Attributes
The `<helios-player>` observes the following attributes:
- `src`: URL of the composition to load.
- `width`: Width of the player (aspect ratio).
- `height`: Height of the player (aspect ratio).
- `autoplay`: Automatically start playback when loaded.
- `loop`: Loop playback when finished.
- `controls`: Show/hide the control bar.
- `export-format`: Format for client-side export (`mp4` or `webm`).
- `input-props`: JSON string of input properties to pass to the composition.
- `poster`: URL of an image to show before loading or playing.
- `preload`: `auto` (default) or `none` (defer loading until interaction).
- `muted`: Mute the audio by default.
- `interactive`: Enable direct interaction with the composition content.

## Public API
The `HeliosPlayer` class exposes the following properties and methods:
- `play(): Promise<void>`
- `pause(): void`
- `currentTime`: number (get/set)
- `currentFrame`: number (get/set)
- `duration`: number (readonly)
- `paused`: boolean (readonly)
- `ended`: boolean (readonly)
- `volume`: number (get/set)
- `muted`: boolean (get/set)
- `playbackRate`: number (get/set)
- `fps`: number (readonly)
- `inputProps`: Record<string, any> | null (get/set)
- `interactive`: boolean (get/set)
- `load(): void`
