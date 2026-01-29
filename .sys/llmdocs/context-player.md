# Context: PLAYER

## A. Component Structure
The `<helios-player>` Web Component encapsulates the playback engine and UI.
- **Shadow Root**: `open`
  - **Status Overlay**: Displays loading/error states (e.g., "Connecting...", "Error: ...").
  - **Poster Container**: Displays poster image and "Big Play Button" before playback starts.
  - **Iframe**: Hosts the composition (sandboxed).
  - **Click Layer**: Transparent overlay to capture clicks for play/pause and focus management.
  - **Captions Container**: Displays burn-in captions.
  - **Controls Overlay**: Standard playback controls (Play/Pause, Volume, Scrubber, Speed, Fullscreen, CC, Export).
    - Responsive layouts: `layout-compact` (<500px), `layout-tiny` (<350px).

## B. Public API (Properties & Methods)
The component exposes a standard HTMLMediaElement-like API.

### Properties
- `src` (string): URL of the composition.
- `currentTime` (number): Current playback time in seconds.
- `duration` (number): Total duration in seconds.
- `paused` (boolean): Whether playback is paused.
- `ended` (boolean): Whether playback has reached the end.
- `volume` (number): Audio volume (0.0 to 1.0).
- `muted` (boolean): Whether audio is muted.
- `playbackRate` (number): Playback speed multiplier (default 1.0).
- `loop` (boolean): Whether to restart upon ending.
- `autoplay` (boolean): Whether to start playing automatically.
- `controls` (boolean): Whether to show built-in controls.
- `poster` (string): URL of the poster image.
- `preload` (string): Loading strategy ('auto', 'none').
- `interactive` (boolean): Whether to pass pointer events to the iframe (disables click-layer).
- `inputProps` (object): Key-value pairs passed to the composition controller.
- `videoWidth` (number): Native width of the composition.
- `videoHeight` (number): Native height of the composition.
- `buffered` (TimeRanges): Ranges of buffered content (simulated).
- `seekable` (TimeRanges): Ranges of seekable content (simulated).
- `seeking` (boolean): Whether the user is currently scrubbing.
- `readyState` (number): Current readiness state (HAVE_NOTHING to HAVE_ENOUGH_DATA).
- `networkState` (number): Current network state (NETWORK_EMPTY to NETWORK_IDLE).
- `currentFrame` (number): Current frame index.
- `fps` (number): Frames per second of the composition.

### Methods
- `play()`: Promise<void> - Starts playback.
- `pause()`: void - Pauses playback.
- `load()`: void - Reloads the composition source.
- `getController()`: HeliosController | null - Returns the internal controller instance.

## C. Attributes
- `src`: Composition URL.
- `width`: Display width (CSS).
- `height`: Display height (CSS).
- `autoplay`: Boolean attribute.
- `loop`: Boolean attribute.
- `controls`: Boolean attribute.
- `poster`: Image URL.
- `preload`: 'auto' | 'none'.
- `muted`: Boolean attribute.
- `interactive`: Boolean attribute.
- `export-format`: 'mp4' | 'webm' (for client-side export).
- `export-mode`: 'auto' | 'canvas' | 'dom' (export strategy).
- `canvas-selector`: CSS selector for canvas capture.
- `input-props`: JSON string for composition input props.

## D. Events
Dispatches standard Media Events:
- `loadstart`, `loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`
- `play`, `pause`, `ended`, `timeupdate`
- `volumechange`, `ratechange`, `durationchange`
- `error` (CustomEvent with detail)
