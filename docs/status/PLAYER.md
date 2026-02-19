**Version**: v0.76.7

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
- Supports **Synchronized Caption Styling**: Captions in the player match the export output (WYSIWYG), with configurable styling via CSS variables (`--helios-caption-scale`, `--helios-caption-bg`, etc.) and responsive font sizing.
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
- **Export API**: Exposes public `export()` method for programmatic control over client-side exports, supporting Video (MP4/WebM) and Snapshot (PNG/JPEG) formats.
- **Export Menu**: Implements a dedicated Export Menu in the player UI (replacing the direct export button action) to allow configuring format, resolution, filename, and captions before exporting or taking a snapshot.

[v0.76.7] ✅ Verified: Integrity Check - Ran full test suite (321 tests passed) and manually confirmed CaptureFrame resizing implementation in controllers.ts and bridge.ts matches the plan.
[v0.76.6] ✅ Verified: Fix CaptureFrame Resizing - Added comprehensive unit tests for OffscreenCanvas resizing logic in DirectController, verifying correct behavior when width/height options are provided.
[v0.76.5] ✅ Completed: Fix CaptureFrame Resizing - Updated DirectController and BridgeController to correctly resize canvas captures when width/height options are provided.
[v0.76.4] ✅ Verified: Integrity - Ran full unit test suite and E2E verification script.
[v0.76.3] ✅ Verified: Enhanced Verification Script - Added E2E tests for `controlslist` and `disablepictureinpicture` attributes, confirming feature availability and stability.
[v0.76.2] ✅ Completed: Sync Dependencies - Updated @helios-project/core and mediabunny dependencies to match workspace versions.
[v0.76.1] ✅ Completed: Fix Verification Script - Updated E2E script to use aria-label assertions for SVG icons.
[v0.76.0] ✅ Completed: Dynamic Audio Metering - Implemented MutationObserver in AudioMeter to detect and meter dynamically added media elements.
[v0.75.0] ✅ Completed: Implement Standard Event Handlers - Implemented standard HTMLMediaElement event handler properties (onplay, onpause, etc.) on HeliosPlayer for improved API parity.
[v0.74.4] ✅ Completed: Sync Version - Synced package.json version with status file and verified all tests pass.
[v0.74.3] ✅ Completed: Fix Async Seek State - Fixed `seeking` property implementation to correctly return `true` during programmatic asynchronous seeks (e.g. via `currentTime` setter), ensuring Standard Media API compliance.
[v0.74.2] ✅ Completed: Api Parity Improvements - Fixed logic for `width`/`height` getters to handle invalid input gracefully, added missing test coverage, and updated documentation for Standard Media API parity.
[v0.74.1] ✅ Completed: Implement SVG Icons - Replaced text-based control icons with inline SVGs for consistent visual styling.
[v0.74.0] ✅ Completed: CSS Parts - Implemented CSS Shadow Parts (`part` attribute) for key UI elements (`controls`, `volume-control`, `scrubber-wrapper`, `poster-image`, `big-play-button`, etc.), enabling full styling customization.
[v0.73.1] ✅ Completed: DOM Export Form Values - Implemented `inlineFormValues` utility to preserve user input (value, checked, selected) in form elements during client-side DOM export.
[v0.73.0] ✅ Completed: Async Seek - Updated `HeliosController.seek` to return a Promise and implemented `HELIOS_SEEK_DONE` handshake in Bridge mode to ensure `seeked` event fires only after frame rendering.
[v0.72.1] ✅ Verified: Test Suite Fixes - Updated tests to use `export()` instead of removed `renderClientSide()` and cleaned up duplicate keys in mock controllers. All 300 tests passed.
[v0.72.1] ✅ Completed: Api Parity - Implemented `width`, `height`, `playsInline` properties and `fastSeek` method on `HeliosPlayer` to improve compatibility with standard `HTMLVideoElement` API.
[v0.72.0] ✅ Completed: Export Menu - Implemented a dedicated Export Menu UI to allow users to configure export options (format, resolution, filename, captions) and take snapshots directly from the player.
[v0.71.0] ✅ Completed: Synchronize Caption Styling - Implemented responsive caption sizing and configurable styling via CSS variables, ensuring visual parity between player preview and client-side export.
[v0.70.5] ✅ Completed: Decouple Core - Decoupled `@helios-project/player` from `@helios-project/core` runtime dependency to fix UMD builds and enable drop-in usage.
[v0.70.4] ✅ Completed: Fix Poster Visibility - Implemented persistent `_hasPlayed` state to ensure poster remains hidden when seeking back to frame 0 after playback.
[v0.70.3] ✅ Completed: Refactor Granular Playback - Refactored renderSettingsMenu to use dynamic generation for playback speed options.
[v0.70.2] ✅ Verified: Granular Playback - Verified expanded playback speed options (0.25x - 2x) via unit tests.
[v0.70.1] ✅ Verified: Robust E2E Verification - Expanded E2E test coverage (Playback, Scrubber, Menus) and created a dependency-free mock fixture to ensure stability.
[v0.70.0] ✅ Completed: Settings Menu - Consolidated secondary controls (Speed, Loop, Range) into a Shadow DOM Settings Menu and removed the standalone speed selector.
[v0.69.0] ✅ Completed: Snapshot Export - Implemented support for exporting the current frame as PNG or JPEG image via the export API, enabling high-quality snapshot capture.
[v0.68.2] ✅ Completed: Shared Audio Context - Implemented `SharedAudioContextManager` to prevent audio hijacking when `AudioMeter` is disposed, ensuring audio playback persists.
[v0.68.1] ✅ Completed: Robust Audio Metering - Refactored `AudioMeter` to support non-destructive toggling, preventing audio playback from stopping when metering is disabled.
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
