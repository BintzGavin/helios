---
title: "Player Changelog"
description: "Changelog for the Player package"
---

# Player Changelog

## v0.68.1
- **Robust Audio Metering**: Refactored `AudioMeter` to support non-destructive toggling, preventing audio playback from stopping when metering is disabled.

## v0.68.0
- **Expose Export API**: Implemented public `export()` method on `<helios-player>` to allow programmatic triggering of client-side exports with configurable options (format, resolution, bitrate, etc.).

## v0.66.1
- **Responsive Images**: Implemented support for capturing currentSrc of responsive images during client-side export, ensuring high-fidelity output.

## v0.66.0
- **Implement VideoTracks API**: Implemented videoTracks property and VideoTrackList API on `<helios-player>` to complete Standard Media API parity.

## v0.65.2
- **Client-Side Audio Volume Support**: Updated `getAudioAssets` to prioritize `audioTrackState` (volume/mute) over DOM attributes for robust client-side export parity.

## v0.65.1
- **Maintenance**: Removed unnecessary TS suppressions and updated documentation with missing API members.

## v0.65.0
- **Media Session Integration**: Implemented HeliosMediaSession to support OS-level media keys and metadata display, observing media-* attributes.

## v0.63.1
- **Fix cuechange on Disable**: Fixed bug where disabling a track cleared active cues without dispatching the cuechange event.

## v0.63.0
- **Implement Active Cues**: Added `activeCues` property and `cuechange` event to `HeliosTextTrack`, and updated `HeliosPlayer` to drive cue updates via the main UI loop.

## v0.62.1
- **Fix SRT Export Filename**: Updated SRT export to respect `export-filename` attribute instead of using hardcoded "captions.srt".

## v0.62.0
- **Export Filename**: Implemented `export-filename` attribute on `<helios-player>` to allow customizing the filename of client-side exported videos.

## v0.61.0
- **Expose Composition Setters**: Implemented `setDuration`, `setFps`, `setSize`, and `setMarkers` in `HeliosController` and updated Bridge protocol to support dynamic composition updates from the host.

## v0.60.0
- **Headless Audio Support**: Updated `getAudioAssets` and controllers to include audio tracks from Helios state metadata in client-side exports, prioritizing them over DOM elements.

## v0.59.1
- **Documentation Update**: Added missing export attributes, audio fades, and diagnostics API to README.

## v0.59.0
- **Implement Diagnostics UI Overlay**: Implemented a visible Diagnostics UI overlay in `<helios-player>` toggled via `Shift+D`, and exposed `diagnose()` as a public method.

## v0.58.0
- **Configurable Export Bitrate**: Implemented `export-bitrate` attribute to control client-side export quality.

## v0.57.1
- **Fix Test Environment & Sync Version**: Updated package version to match status file, installed missing dependencies, and verified all tests pass (including Shadow DOM export).

## v0.57.0
- **Configurable Export Resolution**: Implemented `export-width` and `export-height` attributes to allow specifying target resolution for client-side exports, enabling high-quality DOM exports independent of player size.

## v0.56.2
- **Fix Core Dependency**: Updated `packages/player/package.json` to depend on `@helios-project/core@^5.0.1` to resolve version mismatch and fix the build.

## v0.56.0
- **Expose Diagnostics**: Implemented `diagnose()` method in `HeliosController` (Direct and Bridge) to expose environment capabilities (WebCodecs, etc.) to the host.

## v0.55.0
- **Shadow DOM Export**: Implemented `cloneWithShadow` and recursive asset inlining to support capturing content inside Shadow DOM (Web Components) during client-side export.

## v0.54.0
- **Audio Fades**: Implemented audio fade-in and fade-out support in client-side exporter via `data-helios-fade-in` and `data-helios-fade-out` attributes.

## v0.53.0
- **Smart Controls**: Implemented 'disablepictureinpicture' attribute and auto-hiding CC button/auto-enabling default tracks.

## v0.52.0
- **WebVTT Support**: Implemented `caption-parser` to support standard WebVTT captions alongside SRT, enabling broader compatibility with caption file formats.

## v0.51.0
- **Expose Audio Track IDs**: Updated `getAudioAssets` to populate `id` from `data-helios-track-id`, standard `id`, or fallback index, enabling robust track identification.

## v0.50.0
- **Audio Track Control**: Added `setAudioTrackVolume` and `setAudioTrackMuted` to `HeliosController` and the Bridge protocol, enabling granular audio control.

## v0.49.0
- **Picture-in-Picture**: Implemented `requestPictureInPicture` API and UI toggle button for the player.
- **Persist Media Properties**: Implemented persistence for `volume`, `playbackRate`, and `muted` properties so values set before the player loads are applied when the controller connects.

## v0.48.1
- **Harden Bridge Security**: Implemented explicit source verification for all postMessage listeners in HeliosPlayer and BridgeController to prevent cross-talk and improve security.

## v0.48.0
- **Implement SRT Export**: Added `export-caption-mode` attribute to support exporting captions as separate `.srt` files instead of burning them in, and added `srt-parser` serialization logic.

## v0.47.0
- **Scrubber Tooltip**: Implemented hover tooltip for scrubber showing precise timestamp, and added 'M' key shortcut for muting. Updated package exports for better developer experience.

## v0.46.1
- **Migrate Client-Side Export to Mediabunny**: Replaced deprecated `mp4-muxer` and `webm-muxer` with `mediabunny`, modernizing the export pipeline.

## v0.46.0
- **Visualize Markers**: Implemented visual rendering of timeline markers on the scrubber, including clickable interaction to seek to the marker's timestamp.

## v0.45.0
- **Interactive Playback Range**: Implemented `I` (In), `O` (Out), and `X` (Clear) keyboard shortcuts to set the playback loop range interactively.

## v0.44.2
- **Fix load() Behavior**: Updated `load()` to reload the current source if no pending source exists, and refactored `retryConnection` to use this standard method.

## v0.44.1
- **Documentation Update**: Synced package.json version and documented missing features (sandbox, controlslist, textTracks, CSS vars).

## v0.44.0
- **Configurable Sandbox**: Implemented `sandbox` attribute on `<helios-player>` to allow customizing iframe security flags (defaulting to `allow-scripts allow-same-origin`).

## v0.43.0
- **Implement TextTracks API**: Added `textTracks` property and `addTextTrack` method to `HeliosPlayer`, along with a robust SRT parser and `HeliosTextTrack` implementation for better HTMLMediaElement parity.

## v0.42.0
- **Import SRT Captions**: Implemented support for <track> elements to import SRT captions via the setCaptions API.

## v0.41.0
- **Standard Media API Gap Fill**: Implemented `canPlayType`, `defaultMuted`, `defaultPlaybackRate`, `preservesPitch`, `srcObject`, and `crossOrigin` for fuller `HTMLMediaElement` parity.

## v0.40.0
- **Range-Based Export**: Client-side export now respects the active 'playbackRange' (loop region), exporting only the selected portion of the timeline.

## v0.39.0
- **Native Loop Support**: Refactored `HeliosController` and `bridge` to use `helios.setLoop()` natively, removing manual client-side looping logic.

## v0.38.0
- **Visualize Playback Range**: Implemented visual indicator for playback range on the timeline scrubber using CSS gradients and `updateUI` logic.

## v0.37.0
- **CSS Variables for Theming**: Exposed CSS variables to enable theming of the player controls and UI.

## v0.36.0
- **ControlsList Support**: Implemented `controlslist` attribute support to allow hiding Export and Fullscreen buttons (`nodownload`, `nofullscreen`).

## v0.35.1
- **Implement error and currentSrc properties**: Added `error` and `currentSrc` getters to `HeliosPlayer` to complete HTMLMediaElement parity.

## v0.35.0
- **Implement Playback Range**: Implemented setPlaybackRange and clearPlaybackRange in HeliosController and Bridge protocol.

## v0.34.0
- **Implement Seeking Events & Played Property**: Implemented seeking/seeked events and played property to complete HTMLMediaElement parity.

## v0.33.2
- **Verify Deep API Parity**: Fixed test environment, verified Deep API Parity tests pass, and updated README with new API members.

## v0.33.1
- **Fix Player Metadata**: Synced package.json version with status file (0.5.2 -> 0.33.1) and updated @helios-project/core dependency to 2.7.0.

## v0.33.0
- **Deep API Parity**: Implemented `videoWidth`, `videoHeight`, `buffered`, `seekable`, `seeking` properties on `<helios-player>` for compatibility with third-party wrappers.

## v0.32.2
- **Polish Click-To-Play & Fix Z-Index**: Fixed bug where controls were blocked by click-layer and ensured player grabs focus on click.

## v0.32.1
- **Fix Player Dependencies**: Updated @helios-project/core dependency and fixed build environment to enable verification.

## v0.32.0
- **Implement Standard Media States**: Added `readyState`, `networkState` properties and constants, along with lifecycle events (`loadstart`, `loadedmetadata`, `canplay`, `canplaythrough`) to `<helios-player>`.

## v0.31.0
- **Implement Standard Media API properties**: Added missing properties `src`, `autoplay`, `loop`, `controls`, `poster`, `preload` to `HeliosPlayer` class to fully comply with HTMLMediaElement interface expectations. Updated `observedAttributes` to include `preload`. Updated dependencies to fix build issues.

## v0.30.0
- **Audio Export Enhancements**: Implemented `loop` and `startTime` support for client-side audio export, plus declarative `volume` attribute parsing.

## v0.29.0
- **Interactive Mode**: Implemented `interactive` attribute to toggle between standard video controls and direct iframe interaction.

## v0.28.0
- **Harden Player Connection**: Implemented polling logic for Direct Mode connection to handle asynchronous composition initialization.

## v0.27.0
- **Implement Muted Attribute**: Added support for the `muted` attribute to `<helios-player>`, enabling declarative control of audio mute state.

## v0.26.1
- **Poster Visibility**: Refined logic to prioritize poster visibility over "Loading/Connecting" status overlay during initialization.

## v0.26.0
- **Bridge Error Propagation**: Implemented global error handling in `bridge.ts` and `HeliosController`.

## v0.25.2
- **Polish Burn-In Captions**: Added text shadow to exported captions to match player UI styling and improved code hygiene by preventing canvas state leaks.

## v0.23.0
- **Implement Input Props**: Implemented `input-props` attribute/property on `<helios-player>` to pass dynamic data to the composition controller.

## v0.22.0
- **Export Burn-In Captions**: Implemented caption rendering (burn-in) for client-side export using intermediate OffscreenCanvas.

## v0.21.0
- **Video Inlining**: Implemented `inlineVideos` to capture `<video>` elements as images during client-side export, ensuring visual fidelity.

## v0.20.0
- **Client Side Audio Volume**: Updated exporter to respect `volume` and `muted` attributes of audio elements during client-side export.

## v0.19.0
- **Implement Standard Media API**: Implemented standard media properties (currentTime, duration, etc.) and events (play, pause, timeupdate) for improved interoperability.

## v0.18.0
- **WebM Export**: Implemented `export-format` attribute to support WebM (VP9/Opus) video export alongside MP4.

## v0.17.1
- **Touch Support**: Added touch event listeners to the scrubber to support smooth seeking on mobile devices.

## v0.17.0
- **Implement Captions**: Added caption rendering overlay and "CC" toggle button to `<helios-player>`, leveraging `activeCaptions` from core state.

## v0.16.0
- **Volume Controls**: Implemented volume slider and mute button in UI, updated controllers and bridge protocol.

## v0.15.0
- **Export UX**: Implemented Error Overlay with "Dismiss" action for client-side export failures, providing visibility into errors like unsupported codecs.

## v0.14.0
- **Accessibility Improvements**: Implemented ARIA labels and roles for controls, including dynamic updates for play state and scrubber time.

## v0.13.0
- **Frame-by-Frame Controls**: Implemented `.`/`,` for single-frame stepping and updated Arrow keys to default to 1 frame (10 with Shift).

## v0.12.0
- **Scrubber UX**: Implemented improved scrubber interaction (pause on scrub, anti-jitter) to ensure smooth seeking without fighting the update loop.

## v0.11.1
- **Dom Canvas Capture**: Implemented `inlineCanvases` to replace `<canvas>` elements with data-URI images during DOM export, ensuring mixed content is preserved.

## v0.11.0
- **Lock UI During Export**: Disabled playback controls and keyboard shortcuts during client-side export to ensure data integrity.

## v0.10.1
- **Bridge Documentation**: Added README.md and improved connection error message to guide users towards `connectToParent`.

## v0.10.0
- **CSS Asset Inlining**: Implemented parsing and inlining of assets (images, fonts) referenced in CSS via `url()` as Data URIs for robust DOM export.

## v0.9.0
- **Client-Side Image Inlining**: Implemented fetching and inlining of `<img>` and `background-image` sources as Data URIs for robust DOM export.

## v0.8.1
- **Scaffold Tests (Update)**: Added tests for invalid VideoEncoder configurations and verified test suite.

## v0.8.0
- **Client Side Audio**: Implemented audio capture, mixing (OfflineAudioContext), and encoding (AAC) for client-side export.

## v0.7.0
- **Enable External Stylesheets**: Updated DOM capture to fetch and inline external CSS (`<link rel="stylesheet">`) for high-fidelity exports.

## v0.6.0
- **Keyboard & Fullscreen Support**: Implemented standard keyboard shortcuts (Space, F, Arrows) and Fullscreen UI/logic.

## v0.5.2
- **Scaffold Tests**: Added unit test suite for controllers and exporter using Vitest.

## v0.5.1
- **Standard Attributes**: Implemented `autoplay`, `loop`, and `controls` attributes. Synced version and artifacts.

## v0.5.0
- **Dynamic Sizing**: Implemented `observedAttributes` for `src`, `width`, and `height` to allow dynamic player updates.

## v0.4.0
- **Robust DOM Export**: Implemented XMLSerializer/SVG-based DOM capture for high-fidelity export in Direct and Bridge modes.

## v0.3.3
- **Sync player state with engine state**: Updated Bridge Protocol to include initial state in handshake.

## v0.3.2
- **Variable Speed**: Added `setPlaybackRate` to `HeliosController` and Speed Selector UI to `<helios-player>`.

## v0.3.1
- **Loading UI**: Verified implementation of loading and error state overlays.

## v0.3.0
- **Export Config**: Added `export-mode` and `canvas-selector` attributes for explicit export control.

## v0.2.0
- **Refactor Player Export**: Extracted `ClientSideExporter`, added cancellation support, and modularized controllers.
