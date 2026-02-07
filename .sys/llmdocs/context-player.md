# PLAYER Context

**Domain**: `packages/player`
**Component**: `<helios-player>`

## A. Component Structure
The Shadow DOM contains:
- `iframe`: Sandboxed environment for the composition.
- `.controls`: UI overlay (Play/Pause, Volume, Scrubber, Audio Menu, CC, Settings, Export, Fullscreen, PiP).
- `.status-overlay`: Visual feedback for connection/loading states.
- `.poster-container`: Poster image overlay.
- `.audio-menu`: Popup menu for individual audio track control.
- `.settings-menu`: Popup menu for Playback Speed (0.25x - 2x), Loop, Playback Range, Shortcuts, and Diagnostics.
- `.export-menu`: Popup menu for Export and Snapshot configuration.
- `.shortcuts-overlay`: Overlay displaying keyboard shortcuts.
- `.captions-container`: Overlay for rendering captions.
- `.debug-overlay`: Diagnostics UI (toggled via Settings or Shift+D).

## B. Events
- `play`: Playback started.
- `pause`: Playback paused.
- `ended`: Playback completed (looping logic handles restarts).
- `timeupdate`: Current time changed.
- `volumechange`: Volume or mute state changed.
- `ratechange`: Playback rate changed.
- `durationchange`: Duration changed.
- `seeking`: Seek operation started.
- `seeked`: Seek operation completed.
- `loadstart`: Loading process started.
- `loadedmetadata`: Metadata (duration, dimensions) loaded.
- `canplay`: Sufficient data to play.
- `canplaythrough`: Sufficient data to play through.
- `error`: An error occurred.
- `audiometering`: Fired with `AudioLevels` data (stereo RMS/Peak).
- `enterpictureinpicture`: Entered PiP mode.
- `leavepictureinpicture`: Left PiP mode.

## C. Observed Attributes
- `src`: URL of the composition.
- `width`, `height`: Dimensions.
- `autoplay`, `loop`, `controls`: Boolean attributes.
- `muted`: Initial mute state.
- `poster`: URL of poster image.
- `preload`: `auto` | `none` (defers load).
- `interactive`: Enables direct interaction with iframe content.
- `sandbox`: Iframe security flags (default: `allow-scripts allow-same-origin`).
- `controlslist`: `nodownload`, `nofullscreen`.
- `disablepictureinpicture`: Hides PiP control.
- `input-props`: JSON string for composition properties.
- `export-mode`: `auto` | `canvas` | `dom`.
- `export-format`: `mp4` | `webm`.
- `export-caption-mode`: `burn-in` | `file` (SRT).
- `export-width`, `export-height`: Target resolution for client-side export.
- `export-bitrate`: Target bitrate (bps).
- `export-filename`: Custom filename for export.
- `canvas-selector`: CSS selector for canvas capture.
- `media-*`: Metadata attributes (title, artist, album, artwork).

## D. Properties (API)
- `currentTime` (get/set): Current playback time in seconds.
- `duration` (get): Duration in seconds.
- `paused`, `ended` (get): Playback state.
- `volume` (get/set): Master volume (0-1).
- `muted` (get/set): Master mute state.
- `playbackRate` (get/set): Playback speed multiplier.
- `src` (get/set): Source URL.
- `width`, `height` (get/set): Reflects width/height attributes.
- `videoWidth`, `videoHeight` (get): Intrinsic dimensions.
- `playsInline` (get/set): Reflects playsinline attribute.
- `buffered`, `seekable`, `played` (get): `TimeRanges`.
- `readyState`, `networkState` (get): Loading states.
- `error` (get): Current error.
- `textTracks` (get): `HeliosTextTrackList`.
- `audioTracks` (get): `HeliosAudioTrackList`.
- `videoTracks` (get): `HeliosVideoTrackList`.
- `inputProps` (get/set): Object for composition properties.
- `sandbox` (get/set): Security flags.
- `disablePictureInPicture` (get/set): PiP availability.
- `seeking` (get): Whether the player is currently seeking (scrubbing or waiting for async seek).

## E. Public Methods
- `play(): Promise<void>`: Start playback.
- `pause(): void`: Pause playback.
- `load(): void`: Reload the source.
- `fastSeek(time: number): void`: Seek to time.
- `requestPictureInPicture(): Promise<PictureInPictureWindow>`: Enter PiP mode.
- `addTextTrack(kind, label, language): HeliosTextTrack`: Create a new text track.
- `diagnose(): Promise<DiagnosticReport>`: Run environment diagnostics.
- `startAudioMetering()`: Enable audio level events (non-destructive).
- `stopAudioMetering()`: Disable audio level events (maintains playback).
- `export(options?: HeliosExportOptions): Promise<void>`: Trigger client-side export programmatically.

## F. CSS Variables
- `--helios-controls-bg`: Background color for controls.
- `--helios-text-color`: Text color.
- `--helios-accent-color`: Accent color (buttons, sliders).
- `--helios-range-track-color`: Scrubber track color.
- `--helios-caption-scale`: Caption font size scale relative to player height (default: 0.05).
- `--helios-caption-bg`: Caption background color.
- `--helios-caption-color`: Caption text color.
- `--helios-caption-font-family`: Caption font family.

## G. CSS Parts
- `iframe`: The composition iframe.
- `controls`: Main controls container.
- `play-pause-button`: Play/Pause button.
- `volume-control`: Volume button and slider container.
- `volume-button`: Mute/Unmute button.
- `volume-slider`: Volume range input.
- `audio-button`: Audio tracks menu toggle button.
- `cc-button`: Captions toggle button.
- `export-button`: Export menu toggle button.
- `scrubber-wrapper`: Scrubber and markers container.
- `scrubber`: Time seek range input.
- `tooltip`: Scrubber hover tooltip.
- `markers`: Container for timeline markers.
- `time-display`: Current time / Duration text.
- `fullscreen-button`: Fullscreen toggle button.
- `pip-button`: Picture-in-Picture toggle button.
- `settings-button`: Settings menu toggle button.
- `audio-menu`: Audio tracks popup menu.
- `settings-menu`: Settings popup menu.
- `export-menu`: Export options popup menu.
- `shortcuts-overlay`: Keyboard shortcuts overlay container.
- `shortcuts-header`: Header of the shortcuts overlay.
- `shortcuts-grid`: Grid container for shortcuts list.
- `debug-overlay`: Diagnostics overlay container.
- `debug-header`: Header of the diagnostics overlay.
- `debug-content`: Preformatted text content of diagnostics.
- `overlay`: Status overlay (Connecting/Error).
- `status-text`: Text element in the status overlay.
- `retry-button`: Retry button in the status overlay.
- `poster`: Poster container.
- `poster-image`: The poster `<img>` element.
- `big-play-button`: The large play button overlay.
- `click-layer`: Transparent layer capturing clicks for play/pause.
- `captions`: Captions overlay container.
