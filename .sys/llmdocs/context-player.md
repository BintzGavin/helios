# Context: PLAYER

## A. Component Structure
The `<helios-player>` component uses a Shadow DOM to encapsulate its styles and structure.

**Shadow Root:**
- `<style>`: Encapsulated CSS.
- `<slot>`: (Hidden) Accepts light DOM children like `<track>` elements.
- `.status-overlay`: Displays loading, connecting, and error states.
- `.poster-container`: Displays the poster image and "Big Play Button".
- `<iframe>`: Hosts the Helios composition (sandboxed).
- `.click-layer`: Captures clicks for play/pause and double-clicks for fullscreen.
- `.captions-container`: Displays active captions.
- `.pip-video`: Hidden video element used for Picture-in-Picture proxy.
- `.controls` (role="toolbar"): Contains playback controls (Play/Pause, Volume, Captions, Export, Speed, Scrubber Wrapper, Time Display, Fullscreen, PiP).
  - `.scrubber-wrapper`: Container for the scrubber range input and markers.
    - `.scrubber-tooltip`: Displays timestamp on hover.
    - `.markers-container`: Overlays visual markers on the timeline track.
    - `.scrubber`: The seek range input.

## B. Events
The component dispatches standard HTMLMediaElement events:

- `play`: Playback has started.
- `pause`: Playback has paused.
- `ended`: Playback has reached the end.
- `timeupdate`: The `currentTime` has changed.
- `volumechange`: Volume or muted state has changed.
- `ratechange`: Playback rate has changed.
- `durationchange`: Duration has changed.
- `seeking`: A seek operation has started.
- `seeked`: A seek operation has completed.
- `loadstart`: Loading has started.
- `loadedmetadata`: Metadata (duration, dimensions) is loaded.
- `loadeddata`: Initial data is loaded.
- `canplay`: The player can start playing.
- `canplaythrough`: The player can play through without buffering.
- `enterpictureinpicture`: The player has entered Picture-in-Picture mode.
- `leavepictureinpicture`: The player has left Picture-in-Picture mode.
- `error`: An error occurred.

## C. Attributes
The component observes the following attributes:

- `src`: URL of the Helios composition to load.
- `width`: Width of the player (aspect-ratio calculation).
- `height`: Height of the player (aspect-ratio calculation).
- `autoplay`: Boolean attribute to start playback automatically.
- `loop`: Boolean attribute to loop playback.
- `controls`: Boolean attribute to show/hide controls.
- `muted`: Boolean attribute to start muted.
- `interactive`: Boolean attribute to allow direct interaction with the iframe.
- `poster`: URL of the poster image to show before loading/playing.
- `preload`: Hint for preloading behavior (`auto`, `metadata`, `none`).
- `export-format`: Format for client-side export (`mp4`, `webm`).
- `export-caption-mode`: Mode for caption export (`burn-in` or `file`).
- `export-width`: Target width for client-side export (overrides player size).
- `export-height`: Target height for client-side export (overrides player size).
- `input-props`: JSON string of properties to pass to the composition.
- `controlslist`: Space-separated tokens to customize UI (`nodownload`, `nofullscreen`).
- `crossorigin`: CORS setting for the element (`anonymous`, `use-credentials`).
- `sandbox`: Space-separated tokens for iframe security flags (default: `allow-scripts allow-same-origin`).
- `disablepictureinpicture`: Boolean attribute to hide the Picture-in-Picture button.

## D. Child Elements
- `<track>`: Standard HTMLTrackElement for importing captions (kind="captions"). Requires `src` (SRT or WebVTT file). Automatically populates the `textTracks` list.

## E. Styling
The component exposes the following CSS variables for theming:

- `--helios-controls-bg`: Background color of the controls bar.
- `--helios-text-color`: Text and icon color.
- `--helios-accent-color`: Accent color (e.g., active states, buttons).
- `--helios-range-track-color`: Background color of sliders/scrubbers.
- `--helios-range-selected-color`: Color of the playback range region on the scrubber.
- `--helios-range-unselected-color`: Color of the scrubber track outside the range.
- `--helios-font-family`: Font family for the player UI.

## F. Public API Members
Properties and methods available on the `HeliosPlayer` element instance:

- `getController()`: Returns the underlying `HeliosController` instance (if connected).
- `textTracks`: Returns a `HeliosTextTrackList` object containing `HeliosTextTrack` instances.
- `addTextTrack(kind, label, language)`: Creates and returns a new `HeliosTextTrack`.
- `play()`: Starts playback.
- `pause()`: Pauses playback.
- `load()`: Reloads the current source (or loads pending source).
- `currentTime`: Get/Set current time in seconds.
- `duration`: Get duration in seconds.
- `paused`: Boolean indicating if paused.
- `ended`: Boolean indicating if playback finished.
- `videoWidth` / `videoHeight`: Dimensions of the composition.
- `buffered`: Returns a `TimeRanges` object.
- `seekable`: Returns a `TimeRanges` object.
- `seeking`: Boolean indicating if seeking is active.
- `readyState`: Number indicating readiness state.
- `networkState`: Number indicating network state.
- `error`: `MediaError` object or null.
- `currentSrc`: The current absolute URL of the source.
- `volume`: Get/Set audio volume (0.0 to 1.0).
- `muted`: Get/Set muted state (boolean).
- `playbackRate`: Get/Set playback speed.
- `defaultMuted`: Get/Set default muted state.
- `defaultPlaybackRate`: Get/Set default playback speed.
- `canPlayType(type)`: Returns string indicating support (always empty for video MIME types).
- `requestPictureInPicture()`: Request Picture-in-Picture mode (returns Promise<PictureInPictureWindow>).
- `disablePictureInPicture`: Get/Set disable state for Picture-in-Picture button.

**HeliosController Interface:**
The controller returned by `getController()` provides advanced methods:
- `getAudioTracks(): Promise<AudioAsset[]>`: Returns list of available audio tracks (including `id`, `volume`, `muted`, `fadeInDuration`, `fadeOutDuration`).
- `setAudioTrackVolume(trackId: string, volume: number): void`
- `setAudioTrackMuted(trackId: string, muted: boolean): void`
- `setInputProps(props: Record<string, any>): void`
- `setPlaybackRange(startFrame: number, endFrame: number): void`
- `clearPlaybackRange(): void`
- `setDuration(seconds: number): void`: Updates the composition duration.
- `setFps(fps: number): void`: Updates the composition frame rate.
- `setSize(width: number, height: number): void`: Updates the composition resolution.
- `setMarkers(markers: Marker[]): void`: Updates the timeline markers.
- `diagnose(): Promise<DiagnosticReport>`: Returns a diagnostic report of the environment capabilities (WebCodecs, WebGL, etc.).

## G. Interaction
- **Keyboard Shortcuts**:
  - `Space` / `K`: Play/Pause
  - `M`: Toggle Mute
  - `F`: Toggle Fullscreen
  - `Left` / `Right`: Seek -1/+1 frame (Shift: -10/+10)
  - `,` / `.`: Seek -1/+1 frame
  - `I`: Set In-point (Playback Range Start)
  - `O`: Set Out-point (Playback Range End)
  - `X`: Clear Playback Range
