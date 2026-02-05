**Version**: v0.68.0

**Posture**: STABLE AND FEATURE COMPLETE

# Status: PLAYER

## Identity
- **Role**: Frontend / Player Agent
- **Domain**: `packages/player`
- **Responsibility**: `<helios-player>` Web Component, UI controls, iframe bridge.

## Current State
- `<helios-player>` uses a modular architecture with `HeliosController` (Direct/Bridge) and `ClientSideExporter`.
- Client-side export supports explicit configuration via `export-mode`, `canvas-selector`, and `export-caption-mode` attributes.
- Supports specifying target export resolution via `export-width` and `export-height` attributes, enabling high-quality exports independent of player preview size.
- Supports exporting captions as `.srt` files (`export-caption-mode="file"`) or burning them into the video (`burn-in`).
- Supports sandboxed iframes and cross-origin usage via `postMessage` bridge.
- Includes visual feedback for loading and error states (connection timeouts).
- Supports variable playback speed via UI and Controller API.
- Implements Robust DOM Export using XMLSerializer and SVG foreignObject, including external stylesheets.
- Supports dynamic sizing via `width`/`height` attributes and `src` changes.
- Supports standard keyboard shortcuts (Space/K, F, Arrows) and Fullscreen toggle.
- Supports frame-by-frame navigation via `.` and `,` keys, and Shift modifier for 10-frame jumps.
- Supports Interactive Playback Range via keyboard shortcuts (`I`, `O`, `X`).
- Displays actionable error messages with "Dismiss" option for failed client-side exports.
- Supports Volume and Mute controls via UI and Bridge.
- Supports Audio Track Volume and Mute controls via Controller API and Bridge.
- **Audio Track UI**: Implements a dedicated Audio Menu in the player controls (toggled by '🎵' button) to mute/unmute and adjust volume for individual audio tracks.
- Supports caption rendering overlay with toggleable "CC" button.
- Supports WebM (VP9/Opus) client-side export via `export-format` attribute.
- Implements Standard Media API (play, pause, currentTime, events) for better interoperability.
- Client-side audio export respects `volume` and `muted` properties of audio elements.
- Client-side export (DOM mode) now inlines `<video>` elements as static images, ensuring they are visible in the exported output.
- Supports declarative data binding via `input-props` attribute (JSON string) and property, enabling dynamic composition updates.
- Supports `poster` and `preload` attributes. `preload="none"` defers iframe loading until the user interacts with the new "Big Play Button".
- Implements responsive controls using `ResizeObserver`, adapting UI layout for smaller widths (hiding volume/speed controls).
- Fully implemented Standard Media API properties (`src`, `autoplay`, `loop`, `controls`, `poster`, `preload`) as getters/setters on `HeliosPlayer`.
- Implemented `readyState` and `networkState` properties and standard lifecycle events (`loadstart`, `loadedmetadata`, `canplay`, etc.), aligning with HTMLMediaElement specifications.
- Implements Deep API Parity (`videoWidth`, `videoHeight`, `buffered`, `seekable`, `seeking`) to support integration with standard video wrappers.
- Implements `controlslist` attribute support (`nodownload`, `nofullscreen`) to customize UI visibility.
- Implements CSS Variables (custom properties) for theming the player UI (`--helios-controls-bg`, `--helios-accent-color`, etc.).
- Supports Native Loop via `setLoop` in Controller/Bridge, removing client-side loop hacks.
- Supports importing SRT and WebVTT captions via standard `<track kind="captions">` child elements and exposes standard `textTracks` / `addTextTrack` API.
- Supports `sandbox` attribute to customize iframe security flags (default: `allow-scripts allow-same-origin`).
- Implemented robust `load()` behavior that supports reloading the current `src` to facilitate programmatic retries.
- Visualizes markers on the timeline, allowing users to identify and seek to specific points of interest.
- Migrated client-side export to use `mediabunny`, replacing deprecated `mp4-muxer` and `webm-muxer`.
- Implemented persistence for `volume`, `playbackRate`, and `muted` properties, ensuring values set before connection are applied upon initialization.
- Implements Smart Controls: 'CC' button is hidden when no tracks are present, and 'Picture-in-Picture' button can be hidden via `disablepictureinpicture`.
- Supports auto-enabling of captions if a track is marked as `default`.
- Supports audio fade-in/out in client-side export via `data-helios-fade-in` and `data-helios-fade-out` attributes.
- Supports Shadow DOM Export: DOM-based client-side export now correctly captures Shadow DOM content (via Declarative Shadow DOM transformation), enabling support for Web Components in exports.
- Supports Environment Diagnostics UI: Implemented `diagnose()` method in `HeliosController` and a visible Diagnostics UI overlay in `<helios-player>` (toggled via `Shift+D`) to expose environment capabilities (WebCodecs, etc.) to the user.
- Supports Headless Audio Export: Client-side export now includes audio tracks manually injected into Helios state (`availableAudioTracks`), enabling headless audio rendering without DOM elements.
- Supports Dynamic Composition Updates: Exposes `setDuration`, `setFps`, `setSize`, and `setMarkers` via `HeliosController` (and Bridge), allowing host applications (like Studio) to update the composition structure dynamically.
- Supports Export Filename: Implemented `export-filename` attribute to allow specifying the filename for client-side exports.
- Supports Active Cues: Implemented `activeCues` property and `cuechange` event on `HeliosTextTrack` for Standard Media API parity.
- **Audio Metering**: Supports real-time audio metering via `startAudioMetering()` API and `audiometering` event, enabling visualization of audio levels (stereo/peak) in host applications.
- **Export API**: Exposes public `export()` method for programmatic control over client-side exports.

## Critical Task
- **Robust Audio Metering**: Refactor AudioMeter to support non-destructive toggling.

[v0.68.0] ✅ Completed: Expose Export API - Implemented public `export()` method on `<helios-player>` to allow programmatic triggering of client-side exports with configurable options (format, resolution, bitrate, etc.).
[v0.67.0] ✅ Verified: Integrity - Ran full unit test suite (276 tests) and E2E verification script (verify-player.ts).
[v0.67.0] ✅ Completed: Audio Metering Bridge - Implemented real-time audio metering system exposing stereo RMS and Peak levels via `audiometering` event and Bridge protocol.
[v0.66.5] ✅ Completed: Smart PiP Visibility - Implemented auto-hiding of Picture-in-Picture button when environment lacks support or `export-mode="dom"` is active.
[v0.66.4] ✅ Completed: Enhance Keyboard Shortcuts & Fix Sandbox - Implemented standard shortcuts (Captions, Seek Home/End, 0-9) and fixed sandbox attribute behavior to support strict mode.
[v0.66.3] ✅ Verified: Synced package.json version with status file and verified all tests pass.
[v0.66.3] ✅ Completed: Audio Track UI - Implemented audio menu in player controls to mute/unmute and adjust volume of individual audio tracks.
[v0.66.2] ✅ Completed: Handle Connection Timeouts - Implemented error state and event dispatching on connection timeout.
[v0.66.1] ✅ Completed: Responsive Images - Implemented support for capturing currentSrc of responsive images during client-side export, ensuring high-fidelity output.
[v0.66.0] ✅ Completed: Implement VideoTracks API - Implemented videoTracks property and VideoTrackList API on <helios-player> to complete Standard Media API parity.
[v0.65.2] ✅ Completed: Client-Side Audio Volume Support - Updated `getAudioAssets` to prioritize `audioTrackState` (volume/mute) over DOM attributes for robust client-side export parity.
[v0.65.1] ✅ Completed: Maintenance and Documentation - Removed unnecessary TS suppressions and updated documentation with missing API members (media-* attributes, PiP control).
[v0.65.0] ✅ Completed: Media Session Integration - Implemented HeliosMediaSession to support OS-level media keys and metadata display, observing media-* attributes.
[v0.64.1] ✅ Verified: SRT Export Implementation - Verified existing implementation of SRT export and caption parsing against plan requirements.
[v0.64.0] ✅ Completed: Implement AudioTracks API - Implemented audioTracks property and AudioTrackList API on <helios-player> to provide Standard Media API parity and enable granular programmatic control of audio tracks.
[v0.63.1] ✅ Completed: Fix cuechange on Disable - Fixed bug where disabling a track cleared active cues without dispatching the cuechange event.
[v0.63.0] ✅ Completed: Implement Active Cues - Added `activeCues` property and `cuechange` event to `HeliosTextTrack`, and updated `HeliosPlayer` to drive cue updates via the main UI loop.
[v0.62.1] ✅ Completed: Fix SRT Export Filename - Updated SRT export to respect `export-filename` attribute instead of using hardcoded "captions.srt".
[v0.62.0] ✅ Verified: Export Filename - Confirmed implementation and tests for `export-filename` attribute. Synced package.json version.
[v0.62.0] ✅ Completed: Export Filename - Implemented `export-filename` attribute on `<helios-player>` to allow customizing the filename of client-side exported videos.
[v0.61.0] ✅ Completed: Expose Composition Setters - Implemented `setDuration`, `setFps`, `setSize`, and `setMarkers` in `HeliosController` and updated Bridge protocol to support dynamic composition updates from the host.
[v0.60.0] ✅ Completed: Headless Audio Support - Updated `getAudioAssets` and controllers to include audio tracks from Helios state metadata in client-side exports, prioritizing them over DOM elements.
[v0.59.1] ✅ Completed: Documentation Update - Added missing export attributes, audio fades, and diagnostics API to README.
[v0.59.0] ✅ Completed: Implement Diagnostics UI Overlay - Implemented a visible Diagnostics UI overlay in `<helios-player>` toggled via `Shift+D`, and exposed `diagnose()` as a public method.
[v0.58.0] ✅ Completed: Configurable Export Bitrate - Implemented `export-bitrate` attribute to control client-side export quality.
[v0.57.1] ✅ Completed: Fix Test Environment & Sync Version - Updated package version to match status file, installed missing dependencies, and verified all tests pass (including Shadow DOM export).
[v0.57.0] ✅ Completed: Configurable Export Resolution - Implemented `export-width` and `export-height` attributes to allow specifying target resolution for client-side exports, enabling high-quality DOM exports independent of player size.
[v0.56.2] ✅ Completed: Fix Core Dependency - Updated `packages/player/package.json` to depend on `@helios-project/core@^5.0.1` to resolve version mismatch and fix the build.
[v0.56.1] ✅ Verified: Synced package.json version with status file.
[v0.56.0] ✅ Completed: Expose Diagnostics - Implemented `diagnose()` method in `HeliosController` (Direct and Bridge) to expose environment capabilities (WebCodecs, etc.) to the host.
[v0.55.0] ✅ Completed: Shadow DOM Export - Implemented `cloneWithShadow` and recursive asset inlining to support capturing content inside Shadow DOM (Web Components) during client-side export.
[v0.54.0] ✅ Completed: Audio Fades - Implemented audio fade-in and fade-out support in client-side exporter via `data-helios-fade-in` and `data-helios-fade-out` attributes.
[v0.53.0] ✅ Completed: Smart Controls - Implemented 'disablepictureinpicture' attribute and auto-hiding CC button/auto-enabling default tracks.
[v0.52.0] ✅ Completed: WebVTT Support - Implemented `caption-parser` to support standard WebVTT captions alongside SRT, enabling broader compatibility with caption file formats.
[v0.51.0] ✅ Completed: Expose Audio Track IDs - Updated `getAudioAssets` to populate `id` from `data-helios-track-id`, standard `id`, or fallback index, enabling robust track identification.
[v0.50.0] ✅ Completed: Audio Track Control - Added `setAudioTrackVolume` and `setAudioTrackMuted` to `HeliosController` and the Bridge protocol, enabling granular audio control.
[v0.49.3] ✅ Completed: Verify and Harden Persist Media Properties - Added comprehensive unit tests for volume clamping and muted property precedence to verify robustness of persisted media properties.
[v0.49.3] ✅ Verified: Synced package.json version with status file and verified all tests pass.
[v0.49.2] ✅ Completed: Fix API Parity Tests - Updated `api_parity.test.ts` mock controller to match the `HeliosController` interface, ensuring tests pass with the new media persistence logic.
[v0.49.1] ✅ Completed: Persist Media Properties - Implemented persistence for `volume`, `playbackRate`, and `muted` properties so values set before the player loads are applied when the controller connects.
[v0.49.0] ✅ Completed: Picture-in-Picture - Implemented `requestPictureInPicture` API and UI toggle button for the player, supported in Direct/Same-Origin mode.
[v0.48.4] ✅ Completed: Optimize Caption Rendering - Implemented state diffing to prevent unnecessary DOM updates during caption rendering, improving performance.
[v0.48.3] ✅ Completed: Verify Player - Validated interactive playback (play/pause) via E2E test.
[v0.48.2] ✅ Completed: Enforce Bridge Connection Security - Added missing `event.source` check in `connectToParent` (bridge.ts) to verify messages originate from the parent window, completing the bridge security hardening.
[v0.48.1] ✅ Completed: Harden Bridge Security - Implemented explicit source verification for all postMessage listeners in HeliosPlayer and BridgeController to prevent cross-talk and improve security.
[v0.48.0] ✅ Completed: Implement SRT Export - Added `export-caption-mode` attribute to support exporting captions as separate `.srt` files instead of burning them in, and added `srt-parser` serialization logic.
[v0.47.0] ✅ Completed: Scrubber Tooltip - Implemented hover tooltip for scrubber showing precise timestamp, and added 'M' key shortcut for muting. Updated package exports for better developer experience.
[v0.46.1] ✅ Completed: Migrate Client-Side Export to Mediabunny - Replaced deprecated `mp4-muxer` and `webm-muxer` with `mediabunny`, modernizing the export pipeline.
[v0.46.0] ✅ Completed: Visualize Markers - Implemented visual rendering of timeline markers on the scrubber, including clickable interaction to seek to the marker's timestamp.
[v0.45.0] ✅ Completed: Interactive Playback Range - Implemented `I` (In), `O` (Out), and `X` (Clear) keyboard shortcuts to set the playback loop range interactively.
[v0.44.2] ✅ Completed: Fix load() Behavior - Updated `load()` to reload the current source if no pending source exists, and refactored `retryConnection` to use this standard method.
[v0.44.1] ✅ Completed: Documentation Update - Synced package.json version and documented missing features (sandbox, controlslist, textTracks, CSS vars).
[v0.44.0] ✅ Completed: Configurable Sandbox - Implemented `sandbox` attribute on `<helios-player>` to allow customizing iframe security flags (defaulting to `allow-scripts allow-same-origin`).
[v0.43.0] ✅ Completed: Implement TextTracks API - Added `textTracks` property and `addTextTrack` method to `HeliosPlayer`, along with a robust SRT parser and `HeliosTextTrack` implementation for better HTMLMediaElement parity.
[v0.42.0] ✅ Completed: Import SRT Captions - Implemented support for `<track>` elements to import SRT captions via the setCaptions API.
[v0.41.0] ✅ Completed: Standard Media API Gap Fill - Implemented `canPlayType`, `defaultMuted`, `defaultPlaybackRate`, `preservesPitch`, `srcObject`, and `crossOrigin` for fuller `HTMLMediaElement` parity.
[v0.40.0] ✅ Completed: Range-Based Export - Client-side export now respects the active 'playbackRange' (loop region), exporting only the selected portion of the timeline.
[v0.39.0] ✅ Completed: Native Loop Support - Refactored `HeliosController` and `bridge` to use `helios.setLoop()` natively, removing manual client-side looping logic.
[v0.38.0] ✅ Completed: Visualize Playback Range - Implemented visual indicator for playback range on the timeline scrubber using CSS gradients and `updateUI` logic.
[v0.37.0] ✅ Completed: CSS Variables for Theming - Exposed CSS variables to enable theming of the player controls and UI.
[v0.36.0] ✅ Completed: ControlsList Support - Implemented `controlslist` attribute support to allow hiding Export and Fullscreen buttons (`nodownload`, `nofullscreen`).
[v0.35.1] ✅ Completed: Implement error and currentSrc properties - Added `error` and `currentSrc` getters to `HeliosPlayer` to complete HTMLMediaElement parity.
[v0.35.0] ✅ Completed: Implement Playback Range - Implemented setPlaybackRange and clearPlaybackRange in HeliosController and Bridge protocol.
[v0.34.0] ✅ Completed: Implement Seeking Events & Played Property - Implemented seeking/seeked events and played property to complete HTMLMediaElement parity.
[v0.33.2] ✅ Completed: Verify Deep API Parity - Fixed test environment, verified Deep API Parity tests pass, and updated README with new API members.
[v0.33.1] ✅ Completed: Fix Player Metadata - Synced package.json version with status file (0.5.2 -> 0.33.1) and updated @helios-project/core dependency to 2.7.0.
[v0.33.0] ✅ Completed: Deep API Parity - Implemented `videoWidth`, `videoHeight`, `buffered`, `seekable`, `seeking` properties on `<helios-player>` for compatibility with third-party wrappers.
[v0.32.2] ✅ Completed: Polish Click-To-Play & Fix Z-Index - Fixed bug where controls were blocked by click-layer and ensured player grabs focus on click.
[v0.32.1] ✅ Completed: Fix Player Dependencies - Updated @helios-project/core dependency and fixed build environment to enable verification.
[v0.32.0] ✅ Completed: Implement Standard Media States - Added `readyState`, `networkState` properties and constants, along with lifecycle events (`loadstart`, `loadedmetadata`, `canplay`, `canplaythrough`) to `<helios-player>`.
[v0.31.0] ✅ Completed: Implement Standard Media API properties - Added missing properties `src`, `autoplay`, `loop`, `controls`, `poster`, `preload` to `HeliosPlayer` class to fully comply with HTMLMediaElement interface expectations. Updated `observedAttributes` to include `preload`. Updated dependencies to fix build issues.
[v0.30.0] ✅ Completed: Audio Export Enhancements - Implemented `loop` and `startTime` support for client-side audio export, plus declarative `volume` attribute parsing.
[v0.29.0] ✅ Completed: Interactive Mode - Implemented `interactive` attribute to toggle between standard video controls and direct iframe interaction.
[v0.28.0] ✅ Completed: Harden Player Connection - Implemented polling logic for Direct Mode connection to handle asynchronous composition initialization.
[v0.27.0] ✅ Completed: Implement Muted Attribute - Added support for the `muted` attribute to `<helios-player>`, enabling declarative control of audio mute state.
[v0.26.1] ✅ Completed: Poster Visibility - Refined logic to prioritize poster visibility over "Loading/Connecting" status overlay during initialization.
[v0.26.0] ✅ Completed: Bridge Error Propagation - Implemented global error handling in `bridge.ts` and `HeliosController`, enabling the player UI to display runtime errors from the composition.
[v0.25.2] ✅ Completed: Polish Burn-In Captions - Added text shadow to exported captions to match player UI styling and improved code hygiene by preventing canvas state leaks.
[v0.25.1] ✅ Completed: Refine Burn-In Captions - Added multiline caption support and respect for player caption visibility toggle during client-side export.
[v0.25.0] ✅ Completed: Responsive Controls - Implemented `ResizeObserver` to adapt player controls for smaller widths (compact/tiny modes) to prevent overflow.
[v0.24.1] ✅ Completed: Documentation Update - Added missing attributes (poster, preload, input-props), Standard Media API, and Events documentation to README.
[v0.24.0] ✅ Completed: Implement Poster and Preload - Implemented `poster` attribute for custom preview images and `preload` attribute to control loading behavior (including deferred loading with "Big Play Button").
[v0.23.0] ✅ Completed: Implement Input Props - Implemented `input-props` attribute/property on `<helios-player>` to pass dynamic data to the composition controller.
[v0.22.0] ✅ Completed: Export Burn-In Captions - Implemented caption rendering (burn-in) for client-side export using intermediate OffscreenCanvas.
[v0.21.0] ✅ Completed: Video Inlining - Implemented `inlineVideos` to capture `<video>` elements as images during client-side export, ensuring visual fidelity.
[v0.20.1] ✅ Completed: Project Cleanup - Added explicit `vitest` dependency and removed obsolete plan file.
[v0.20.0] ✅ Completed: Client Side Audio Volume - Updated exporter to respect `volume` and `muted` attributes of audio elements during client-side export.
[v0.19.1] ✅ Completed: Verify WebM Export - Verified that WebM export functionality works correctly by running tests and ensuring dependencies are installed.
[v0.19.0] ✅ Completed: Implement Standard Media API - Implemented standard media properties (currentTime, duration, etc.) and events (play, pause, timeupdate) for improved interoperability.
[v0.18.0] ✅ Completed: WebM Export - Implemented `export-format` attribute to support WebM (VP9/Opus) video export alongside MP4.
[v0.17.1] ✅ Completed: Touch Support - Added touch event listeners to the scrubber to support smooth seeking on mobile devices.
[v0.17.0] ✅ Completed: Implement Captions - Added caption rendering overlay and "CC" toggle button to `<helios-player>`, leveraging `activeCaptions` from core state.
[v0.16.0] ✅ Completed: Volume Controls - Implemented volume slider and mute button in UI, updated controllers and bridge protocol.
[v0.15.0] ✅ Completed: Export UX - Implemented Error Overlay with "Dismiss" action for client-side export failures, providing visibility into errors like unsupported codecs.
[v0.14.0] ✅ Completed: Accessibility Improvements - Implemented ARIA labels and roles for controls, including dynamic updates for play state and scrubber time.
[v0.13.0] ✅ Completed: Frame-by-Frame Controls - Implemented `.`/`,` for single-frame stepping and updated Arrow keys to default to 1 frame (10 with Shift).
[v0.12.0] ✅ Completed: Scrubber UX - Implemented improved scrubber interaction (pause on scrub, anti-jitter) to ensure smooth seeking without fighting the update loop.
[v0.11.1] ✅ Completed: Dom Canvas Capture - Implemented `inlineCanvases` to replace `<canvas>` elements with data-URI images during DOM export, ensuring mixed content is preserved.
[v0.11.0] ✅ Completed: Lock UI During Export - Disabled playback controls and keyboard shortcuts during client-side export to ensure data integrity.
[v0.10.1] ✅ Completed: Bridge Documentation - Added README.md and improved connection error message to guide users towards `connectToParent`.
[v0.10.0] ✅ Completed: CSS Asset Inlining - Implemented parsing and inlining of assets (images, fonts) referenced in CSS via `url()` as Data URIs for robust DOM export.
[v0.9.0] ✅ Completed: Client-Side Image Inlining - Implemented fetching and inlining of `<img>` and `background-image` sources as Data URIs for robust DOM export.
[v0.8.1] ✅ Completed: Scaffold Tests (Update) - Added tests for invalid VideoEncoder configurations and verified test suite.
[v0.8.0] ✅ Completed: Client Side Audio - Implemented audio capture, mixing (OfflineAudioContext), and encoding (AAC) for client-side export.
[v0.7.0] ✅ Completed: Enable External Stylesheets - Updated DOM capture to fetch and inline external CSS (`<link rel="stylesheet">`) for high-fidelity exports.
[v0.6.0] ✅ Completed: Keyboard & Fullscreen Support - Implemented standard keyboard shortcuts (Space, F, Arrows) and Fullscreen UI/logic.
[v0.5.2] ✅ Completed: Scaffold Tests - Added unit test suite for controllers and exporter using Vitest.
[v0.5.1] ✅ Completed: Standard Attributes - Implemented `autoplay`, `loop`, and `controls` attributes. Synced version and artifacts.
