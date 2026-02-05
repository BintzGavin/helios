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
- `videoWidth`, `videoHeight` (get): Intrinsic dimensions.
- `buffered`, `seekable`, `played` (get): `TimeRanges`.
- `readyState`, `networkState` (get): Loading states.
- `error` (get): Current error.
- `textTracks` (get): `HeliosTextTrackList`.
- `audioTracks` (get): `HeliosAudioTrackList`.
- `videoTracks` (get): `HeliosVideoTrackList`.
- `inputProps` (get/set): Object for composition properties.
- `sandbox` (get/set): Security flags.
- `disablePictureInPicture` (get/set): PiP availability.

## E. Public Methods
- `play(): Promise<void>`: Start playback.
- `pause(): void`: Pause playback.
- `load(): void`: Reload the source.
- `requestPictureInPicture(): Promise<PictureInPictureWindow>`: Enter PiP mode.
- `addTextTrack(kind, label, language): HeliosTextTrack`: Create a new text track.
- `diagnose(): Promise<DiagnosticReport>`: Run environment diagnostics.
- `startAudioMetering()`: Enable audio level events (non-destructive).
- `stopAudioMetering()`: Disable audio level events (maintains playback).
- `export(options?: HeliosExportOptions): Promise<void>`: Trigger client-side export programmatically.
