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
- `.controls` (role="toolbar"): Contains playback controls (Play/Pause, Volume, Captions, Export, Speed, Scrubber, Time Display, Fullscreen).

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
- `input-props`: JSON string of properties to pass to the composition.
- `controlslist`: Space-separated tokens to customize UI (`nodownload`, `nofullscreen`).
- `crossorigin`: CORS setting for the element (`anonymous`, `use-credentials`).
- `sandbox`: Space-separated tokens for iframe security flags (default: `allow-scripts allow-same-origin`).

## D. Child Elements
- `<track>`: Standard HTMLTrackElement for importing captions (kind="captions"). Requires `src` (SRT file). Automatically populates the `textTracks` list.

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

- `textTracks`: Returns a `HeliosTextTrackList` object containing `HeliosTextTrack` instances.
- `addTextTrack(kind, label, language)`: Creates and returns a new `HeliosTextTrack`.
- `play()`: Starts playback.
- `pause()`: Pauses playback.
- `currentTime`: Get/Set current time in seconds.
- `duration`: Get duration in seconds.
- `paused`: Boolean indicating if paused.
- `ended`: Boolean indicating if playback finished.
- `videoWidth` / `videoHeight`: Dimensions of the composition.
- `canPlayType(type)`: Returns string indicating support (always empty for video MIME types).
