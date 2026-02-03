# Context: PLAYER

## Overview
The **PLAYER** domain is responsible for the `<helios-player>` Web Component, which acts as the visual and interactive frontend for Helios compositions. It manages the `iframe` sandbox, handles user input (UI controls, keyboard shortcuts), and communicates with the composition via the Bridge or Direct Controller. It also handles client-side export functionality.

## A. Component Structure
The `<helios-player>` component uses a Shadow DOM to encapsulate its styles and structure.

- **Root**: `:host` (contains CSS variables for theming)
- **Shadow Root**:
  - **Iframe**: `<iframe sandbox="...">` (The composition environment)
  - **Overlays**:
    - `.status-overlay` (Loading/Connection/Error states)
    - `.poster-container` (Poster image and Big Play Button)
    - `.captions-container` (Caption rendering overlay)
    - `.debug-overlay` (Diagnostics UI)
    - `.click-layer` (Captures clicks for play/pause when controls are hidden)
  - **Controls**: `.controls` (Flexbox container)
    - Play/Pause Button
    - Volume Control (Mute button + Slider)
    - CC Button (Captions toggle)
    - Export Button
    - Speed Selector
    - Scrubber (Progress bar + Markers + Tooltip)
    - Time Display
    - Fullscreen Button
    - Picture-in-Picture Button

## B. Events
The `<helios-player>` component dispatches standard HTMLMediaElement events and custom events:

- `play`: Playback started.
- `pause`: Playback paused.
- `ended`: Playback completed.
- `timeupdate`: Current time changed.
- `volumechange`: Volume or mute state changed.
- `ratechange`: Playback rate changed.
- `durationchange`: Duration changed.
- `seeking`: Seeking operation started (scrubbing or programmatic).
- `seeked`: Seeking operation completed.
- `loadstart`: Loading process started.
- `loadedmetadata`: Metadata (duration, dimensions) loaded.
- `loadeddata`: Initial frame data loaded.
- `canplay`: Ready to play.
- `canplaythrough`: Ready to play without buffering (simulated).
- `error`: An error occurred (details in `error` property).
- `enterpictureinpicture`: Entered PiP mode.
- `leavepictureinpicture`: Left PiP mode.
- `cuechange`: Active cues changed (dispatched by TextTrack, but bubbles or handled).

## C. Attributes
The component observes or reads the following attributes:

- `src`: URL of the Helios composition.
- `width`: Player width (for aspect ratio).
- `height`: Player height (for aspect ratio).
- `autoplay`: Auto-start playback.
- `loop`: Loop playback.
- `controls`: Show/hide default controls.
- `muted`: Initial mute state.
- `poster`: URL of the poster image.
- `preload`: Loading strategy (`auto`, `none`).
- `sandbox`: Iframe sandbox flags (default: `allow-scripts allow-same-origin`).
- `interactive`: Enable direct interaction with the iframe content.
- `controlslist`: Hide specific controls (`nodownload`, `nofullscreen`).
- `disablepictureinpicture`: Hide PiP button.
- `input-props`: JSON string for dynamic props.
- `export-mode`: Export strategy (`auto`, `canvas`, `dom`).
- `canvas-selector`: CSS selector for the canvas element during export (default: `canvas`).
- `export-format`: Export format (`mp4`, `webm`).
- `export-caption-mode`: Caption export mode (`burn-in`, `file`).
- `export-width`: Target width for export.
- `export-height`: Target height for export.
- `export-bitrate`: Target bitrate for export.
- `export-filename`: Output filename for export.

## D. Public API
The `HeliosPlayer` class exposes properties and methods closely mirroring `HTMLMediaElement`:

- **Properties**: `currentTime`, `duration`, `paused`, `ended`, `volume`, `muted`, `playbackRate`, `src`, `currentSrc`, `error`, `readyState`, `networkState`, `buffered`, `seekable`, `played`, `videoWidth`, `videoHeight`, `textTracks`, `audioTracks`.
- **Methods**: `play()`, `pause()`, `load()`, `addTextTrack()`, `requestPictureInPicture()`, `diagnose()`.
- **Getters**: `getController()` (Returns internal controller instance).
