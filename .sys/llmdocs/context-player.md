# context-player.md

## A. Component Structure

The `<helios-player>` Web Component utilizes a Shadow DOM to encapsulate its styles and structure.

- **Shadow Root**
  - **Wrapper** (`div.helios-player`): Main container handling layout and sizing.
    - **Iframe** (`iframe`): The sandboxed environment where the Helios composition runs.
    - **Poster** (`div.helios-poster`): Displays the poster image before playback begins.
    - **Big Play Button** (`button.helios-big-play-button`): Prominent play button for initial interaction.
    - **Loading Overlay** (`div.helios-loading`): Visual indicator during resource loading or buffering.
    - **Error Overlay** (`div.helios-error`): Displays error messages (e.g., connection timeout, export failure).
    - **Controls Overlay** (`div.helios-controls`): The user interface for interacting with the player.
      - **Scrubber** (`input[type="range"]`): Timeline slider for seeking and visualizing progress/buffer/markers.
      - **Control Bar**: Contains playback controls.
        - **Play/Pause Toggle**
        - **Volume Control** (Mute toggle + Slider)
        - **Time Display** (Current Time / Duration)
        - **Audio Track Menu Toggle** (if multiple tracks exist)
        - **Captions Toggle** (CC)
        - **Picture-in-Picture Toggle**
        - **Settings Toggle** (Speed, Loop, Range)
        - **Export Menu Toggle** (Video, Snapshot)
        - **Fullscreen Toggle**
      - **Menus**:
        - **Export Menu**: Options for Format, Resolution, Filename, Captions.
        - **Settings Menu**: Playback Speed, Loop, Playback Range.
        - **Audio Track Menu**: Individual track volume/mute controls.
    - **Diagnostics UI** (`div.helios-diagnostics`): Overlay showing environment capabilities (WebCodecs, etc.), toggled via `Shift+D`.

## B. Events

The `<helios-player>` dispatches standard `HTMLMediaElement` events and custom events:

### Standard Media Events
- `play`: Fired when playback begins.
- `pause`: Fired when playback is paused.
- `ended`: Fired when playback completes.
- `timeupdate`: Fired periodically as the current time changes.
- `volumechange`: Fired when volume or muted state changes.
- `ratechange`: Fired when playback rate changes.
- `seeking`: Fired when a seek operation begins.
- `seeked`: Fired when a seek operation completes.
- `loadstart`: Fired when the user agent begins looking for media data.
- `loadedmetadata`: Fired when media metadata has been loaded.
- `canplay`: Fired when the user agent can play the media.
- `canplaythrough`: Fired when the user agent estimates it can play through without buffering.
- `waiting`: Fired when playback stops because of temporary lack of data.

### Custom Events
- `audiometering`: Fired with audio level data (stereo RMS/Peak) when metering is enabled.

## C. Attributes

The `<helios-player>` observes the following attributes:

### Standard Attributes
- `src`: The URL of the Helios composition to load.
- `width`: The width of the player.
- `height`: The height of the player.
- `autoplay`: Boolean attribute to auto-start playback.
- `loop`: Boolean attribute to loop playback.
- `controls`: Boolean attribute to show/hide default controls.
- `poster`: URL of an image to show before playback.
- `preload`: Hint for how much to preload (`none`, `metadata`, `auto`).
- `muted`: Boolean attribute to default to muted state.

### Configuration Attributes
- `sandbox`: Configures iframe sandbox flags (default: `allow-scripts allow-same-origin`).
- `controlslist`: Allows hiding specific controls (`nodownload`, `nofullscreen`).
- `disablepictureinpicture`: Boolean attribute to disable the PiP button.
- `interactive`: Boolean attribute to enable interactive mode (prevents click-to-pause).
- `input-props`: JSON string of properties to pass to the composition.

### Media Session Attributes
- `media-title`: Title of the media for OS integration.
- `media-artist`: Artist of the media for OS integration.
- `media-album`: Album of the media for OS integration.
- `media-artwork`: URL of the artwork for OS integration.

### Export Attributes
- `export-mode`: Controls export behavior (`auto`, `canvas`, `dom`).
- `canvas-selector`: CSS selector for the canvas to capture in `canvas` mode.
- `export-caption-mode`: Controls caption export (`burn-in`, `file`, `none`).
- `export-width`: Target width for client-side export.
- `export-height`: Target height for client-side export.
- `export-bitrate`: Target bitrate for video export.
- `export-filename`: Filename for the exported file.
- `export-format`: Output format (`mp4`, `webm`).

## D. Public API (HeliosPlayer)

- `play()`: Promise<void>
- `pause()`: void
- `fastSeek(time: number)`: void
- `export(options)`: Promise<void>
- `diagnose()`: Promise<DiagnosticReport>
- `addTextTrack(kind, label, language)`: TextTrack
- `startAudioMetering()`: void
- `stopAudioMetering()`: void
- `requestPictureInPicture()`: Promise<PictureInPictureWindow>

### Properties
- `currentTime`: number (get/set)
- `duration`: number (get)
- `paused`: boolean (get)
- `volume`: number (get/set)
- `muted`: boolean (get/set)
- `playbackRate`: number (get/set)
- `videoWidth`: number (get)
- `videoHeight`: number (get)
- `readyState`: number (get)
- `networkState`: number (get)
- `currentSrc`: string (get)
- `error`: MediaError | null (get)
- `buffered`: TimeRanges (get)
- `seekable`: TimeRanges (get)
- `seeking`: boolean (get)
- `audioTracks`: AudioTrackList (get)
- `videoTracks`: VideoTrackList (get)
- `textTracks`: TextTrackList (get)
