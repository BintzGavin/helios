## PLAYER v0.76.18
- ✅ Completed: Regression Tests for InputProps - Added comprehensive tests for `input-props` JSON parsing edge cases (explicit "null", empty strings).

## PLAYER v0.76.17
- ✅ Completed: Regression Tests for MediaProperties - Added comprehensive tests for cross-origin security checks and media property parity (videoWidth/Height).

## PLAYER v0.76.16
- ✅ Completed: Audio Context Manager Tests - Added comprehensive unit test coverage for SharedAudioContextManager and SharedAudioSource logic to prevent regressions.

## PLAYER v0.76.10
- ✅ Completed: Async Seek - Updated `DirectController.seek` to wait for two `requestAnimationFrame` cycles before resolving, ensuring visual frame rendering is complete.

## PLAYER v0.76.9
- ✅ Completed: Update Context Documentation - Regenerated context-player.md to reflect the latest API and features.

## PLAYER v0.76.8
- ✅ Verified: Exporter Integration - Added integration test to `exporter.test.ts` confirming that `ClientSideExporter` correctly propagates `width` and `height` options to `captureFrame`, ensuring resolution-independent exports work as intended.
- ✅ Completed: Sync Version - Updated package.json to match status file (0.76.8) and verified implementation with full test suite (326 tests passed).
- ✅ Verified: Bridge Capture Resizing - Added specific unit tests for handleCaptureFrame in bridge.ts to verify resizing logic and error handling, complementing existing DirectController tests.

## PLAYER v0.76.7
- ✅ Verified: Integrity Check - Ran full test suite (321 tests passed) and manually confirmed CaptureFrame resizing implementation in controllers.ts and bridge.ts matches the plan.

## PLAYER v0.76.5
- ✅ Completed: Fix CaptureFrame Resizing - Updated DirectController and BridgeController to correctly resize canvas captures when width/height options are provided.

## PLAYER v0.76.3
- ✅ Verified: Enhanced Verification Script - Added E2E tests for `controlslist` and `disablepictureinpicture` attributes, confirming feature availability and stability.

## PLAYER v0.76.1
- ✅ Completed: Fix Verification Script - Updated E2E script to use aria-label assertions for SVG icons.

## PLAYER v0.76.0
- ✅ Completed: Dynamic Audio Metering - Implemented MutationObserver in AudioMeter to detect and meter dynamically added media elements.

## PLAYER v0.75.0
- ✅ Completed: Implement Standard Event Handlers - Implemented standard HTMLMediaElement event handler properties (onplay, onpause, etc.) on HeliosPlayer for improved API parity.

## PLAYER v0.74.4
- ✅ Completed: Sync Version - Synced package.json version with status file and verified all tests pass.

## PLAYER v0.74.1
- ✅ Completed: Implement SVG Icons - Replaced text-based control icons with inline SVGs for consistent visual styling.

## PLAYER v0.74.0
- ✅ Completed: CSS Parts - Implemented CSS Shadow Parts (`part` attribute) for key UI elements (`controls`, `volume-control`, `scrubber-wrapper`, `poster-image`, `big-play-button`, etc.), enabling full styling customization.

## PLAYER v0.73.1
- ✅ Completed: DOM Export Form Values - Implemented `inlineFormValues` utility to preserve user input (value, checked, selected) in form elements during client-side DOM export.

## PLAYER v0.73.0
- ✅ Completed: Async Seek - Updated `HeliosController.seek` to return a Promise and implemented `HELIOS_SEEK_DONE` handshake in Bridge mode to ensure `seeked` event fires only after frame rendering.

## PLAYER v0.72.1
- ✅ Completed: Api Parity - Implemented `width`, `height`, `playsInline` properties and `fastSeek` method on `HeliosPlayer` to improve compatibility with standard `HTMLVideoElement` API.

## PLAYER v0.72.0
- ✅ Completed: Export Menu - Implemented a dedicated Export Menu UI to allow users to configure export options (format, resolution, filename, captions) and take snapshots directly from the player.

## PLAYER v0.71.0
- ✅ Completed: Synchronize Caption Styling - Implemented responsive caption sizing and configurable styling via CSS variables, ensuring visual parity between player preview and client-side export.

## PLAYER v0.70.5
- ✅ Completed: Decouple Core - Decoupled `@helios-project/player` from `@helios-project/core` runtime dependency to fix UMD builds and enable drop-in usage.

## PLAYER v0.70.4
- ✅ Completed: Fix Poster Visibility - Implemented persistent `_hasPlayed` state to ensure poster remains hidden when seeking back to frame 0 after playback.

## PLAYER v0.70.3
- ✅ Completed: Refactor Granular Playback - Refactored renderSettingsMenu to use dynamic generation for playback speed options.

## PLAYER v0.70.0
- ✅ Completed: Settings Menu - Consolidated secondary controls (Speed, Loop, Range) into a Shadow DOM Settings Menu and removed the standalone speed selector.

## PLAYER v0.68.2
- ✅ Completed: Shared Audio Context - Implemented `SharedAudioContextManager` to prevent audio hijacking when `AudioMeter` is disposed, ensuring audio playback persists.

## PLAYER v0.68.1
- ✅ Completed: Robust Audio Metering - Refactored `AudioMeter` to support non-destructive toggling, preventing audio playback from stopping when metering is disabled.

## PLAYER v0.66.5
- ✅ Completed: Smart PiP Visibility - Implemented auto-hiding of Picture-in-Picture button when environment lacks support or `export-mode="dom"` is active.

## PLAYER v0.66.4
- ✅ Completed: Enhance Keyboard Shortcuts & Fix Sandbox - Implemented standard shortcuts (Captions, Seek Home/End, 0-9) and fixed sandbox attribute behavior to support strict mode.

## PLAYER v0.66.3
- ✅ Verified: Synced package.json version with status file and verified all tests pass.
- ✅ Completed: Audio Track UI - Implemented audio menu in player controls to mute/unmute and adjust volume of individual audio tracks.

## PLAYER v0.66.2
- ✅ Completed: Handle Connection Timeouts - Implemented error state and event dispatching on connection timeout.

## PLAYER v0.66.1
- ✅ Completed: Responsive Images - Implemented support for capturing currentSrc of responsive images during client-side export, ensuring high-fidelity output.

## PLAYER v0.66.0
- ✅ Completed: Implement VideoTracks API - Implemented videoTracks property and VideoTrackList API on <helios-player> to complete Standard Media API parity.

## PLAYER v0.65.2
- ✅ Completed: Client-Side Audio Volume Support - Updated `getAudioAssets` to prioritize `audioTrackState` (volume/mute) over DOM attributes for robust client-side export parity.

## PLAYER v0.65.1
- ✅ Completed: Maintenance and Documentation - Removed unnecessary TS suppressions and updated documentation with missing API members (media-* attributes, PiP control).

## PLAYER v0.65.0
- ✅ Completed: Media Session Integration - Implemented HeliosMediaSession to support OS-level media keys and metadata display, observing media-* attributes.

## PLAYER v0.59.1
- ✅ Completed: Documentation Update - Added missing export attributes, audio fades, and diagnostics API to README.

## PLAYER v0.59.0
- ✅ Completed: Implement Diagnostics UI Overlay - Implemented a visible Diagnostics UI overlay in `<helios-player>` toggled via `Shift+D`, and exposed `diagnose()` as a public method.

## PLAYER v0.58.0
- ✅ Completed: Configurable Export Bitrate - Implemented `export-bitrate` attribute to control client-side export quality.

## PLAYER v0.57.1
- ✅ Completed: Fix Test Environment & Sync Version - Updated package version to match status file, installed missing dependencies, and verified all tests pass (including Shadow DOM export).

## PLAYER v0.57.0
- ✅ Completed: Configurable Export Resolution - Implemented `export-width` and `export-height` attributes to allow specifying target resolution for client-side exports, enabling high-quality DOM exports independent of player size.

## PLAYER v0.56.2
- ✅ Completed: Fix Core Dependency - Updated `packages/player/package.json` to depend on `@helios-project/core@^5.0.1` to resolve version mismatch and fix the build.

## PLAYER v0.56.1
- ✅ Verified: Synced package.json version with status file.

## PLAYER v0.56.0
- ✅ Completed: Expose Diagnostics - Implemented `diagnose()` method in `HeliosController` (Direct and Bridge) to expose environment capabilities (WebCodecs, etc.) to the host.

## PLAYER v0.55.0
- ✅ Completed: Shadow DOM Export - Implemented `cloneWithShadow` and recursive asset inlining to support capturing content inside Shadow DOM (Web Components) during client-side export.

## PLAYER v0.54.0
- ✅ Completed: Audio Fades - Implemented audio fade-in and fade-out support in client-side exporter via `data-helios-fade-in` and `data-helios-fade-out` attributes.

## PLAYER v0.53.0
- ✅ Completed: Smart Controls - Implemented 'disablepictureinpicture' attribute and auto-hiding CC button/auto-enabling default tracks.

## PLAYER v0.52.0
- ✅ Completed: WebVTT Support - Implemented `caption-parser` to support standard WebVTT captions alongside SRT, enabling broader compatibility with caption file formats.

## PLAYER v0.51.0
- ✅ Completed: Expose Audio Track IDs - Updated `getAudioAssets` to populate `id` from `data-helios-track-id`, standard `id`, or fallback index, enabling robust track identification.

## PLAYER v0.50.0
- ✅ Completed: Audio Track Control - Added `setAudioTrackVolume` and `setAudioTrackMuted` to `HeliosController` and the Bridge protocol, enabling granular audio control.

## PLAYER v0.49.3
- ✅ Completed: Verify and Harden Persist Media Properties - Added comprehensive unit tests for volume clamping and muted property precedence to verify robustness of persisted media properties.
- ✅ Verified: Synced package.json version with status file and verified all tests pass.

## PLAYER v0.49.2
- ✅ Completed: Fix API Parity Tests - Updated `api_parity.test.ts` mock controller to match the `HeliosController` interface, ensuring tests pass with the new media persistence logic.

## PLAYER v0.49.1
- ✅ Completed: Persist Media Properties - Implemented persistence for `volume`, `playbackRate`, and `muted` properties so values set before the player loads are applied when the controller connects.

## PLAYER v0.49.0
- ✅ Completed: Picture-in-Picture - Implemented `requestPictureInPicture` API and UI toggle button for the player, supported in Direct/Same-Origin mode.

## PLAYER v0.48.4
- ✅ Completed: Optimize Caption Rendering - Implemented state diffing to prevent unnecessary DOM updates during caption rendering, improving performance.

## PLAYER v0.48.3
- ✅ Completed: Verify Player - Validated interactive playback (play/pause) via E2E test.

## PLAYER v0.48.2
- ✅ Completed: Enforce Bridge Connection Security - Added missing `event.source` check in `connectToParent` (bridge.ts) to verify messages originate from the parent window, completing the bridge security hardening.

## PLAYER v0.48.1
- ✅ Completed: Harden Bridge Security - Implemented explicit source verification for all postMessage listeners in HeliosPlayer and BridgeController to prevent cross-talk and improve security.

## PLAYER v0.48.0
- ✅ Completed: Implement SRT Export - Added `export-caption-mode` attribute to support exporting captions as separate `.srt` files instead of burning them in, and added `srt-parser` serialization logic.

## PLAYER v0.47.0
- ✅ Completed: Scrubber Tooltip - Implemented hover tooltip for scrubber showing precise timestamp, and added 'M' key shortcut for muting. Updated package exports for better developer experience.

## PLAYER v0.46.1
- ✅ Completed: Migrate Client-Side Export to Mediabunny - Replaced deprecated `mp4-muxer` and `webm-muxer` with `mediabunny`, modernizing the export pipeline.

## PLAYER v0.46.0
- ✅ Completed: Visualize Markers - Implemented visual rendering of timeline markers on the scrubber, including clickable interaction to seek to the marker's timestamp.

## PLAYER v0.45.0
- ✅ Completed: Interactive Playback Range - Implemented `I` (In), `O` (Out), and `X` (Clear) keyboard shortcuts to set the playback loop range interactively.

## PLAYER v0.44.2
- ✅ Completed: Fix load() Behavior - Updated `load()` to reload the current source if no pending source exists, and refactored `retryConnection` to use this standard method.

## PLAYER v0.44.1
- ✅ Completed: Documentation Update - Synced package.json version and documented missing features (sandbox, controlslist, textTracks, CSS vars).

## PLAYER v0.44.0
- ✅ Completed: Configurable Sandbox - Implemented `sandbox` attribute on `<helios-player>` to allow customizing iframe security flags (defaulting to `allow-scripts allow-same-origin`).

## PLAYER v0.43.0
- ✅ Completed: Implement TextTracks API - Added `textTracks` property and `addTextTrack` method to `HeliosPlayer`, along with a robust SRT parser and `HeliosTextTrack` implementation for better HTMLMediaElement parity.

## PLAYER v0.42.0
- ✅ Completed: Import SRT Captions - Implemented support for <track> elements to import SRT captions via the setCaptions API.

## PLAYER v0.41.0
- ✅ Completed: Standard Media API Gap Fill - Implemented `canPlayType`, `defaultMuted`, `defaultPlaybackRate`, `preservesPitch`, `srcObject`, and `crossOrigin` for fuller `HTMLMediaElement` parity.

## PLAYER v0.40.0
- ✅ Completed: Range-Based Export - Client-side export now respects the active 'playbackRange' (loop region), exporting only the selected portion of the timeline.

## PLAYER v0.39.0
- ✅ Completed: Native Loop Support - Refactored `HeliosController` and `bridge` to use `helios.setLoop()` natively, removing manual client-side looping logic.

## PLAYER v0.38.0
- ✅ Completed: Visualize Playback Range - Implemented visual indicator for playback range on the timeline scrubber using CSS gradients and `updateUI` logic.

## PLAYER v0.37.0
- ✅ Completed: CSS Variables for Theming - Exposed CSS variables to enable theming of the player controls and UI.

## PLAYER v0.36.0
- ✅ Completed: ControlsList Support - Implemented `controlslist` attribute support to allow hiding Export and Fullscreen buttons (`nodownload`, `nofullscreen`).

## PLAYER v0.35.1
- ✅ Completed: Implement error and currentSrc properties - Added `error` and `currentSrc` getters to `HeliosPlayer` to complete HTMLMediaElement parity.

## PLAYER v0.35.0
- ✅ Completed: Implement Playback Range - Implemented setPlaybackRange and clearPlaybackRange in HeliosController and Bridge protocol.

## PLAYER v0.34.0
- ✅ Completed: Implement Seeking Events & Played Property - Implemented seeking/seeked events and played property to complete HTMLMediaElement parity.

## PLAYER v0.33.2
- ✅ Completed: Verify Deep API Parity - Fixed test environment, verified Deep API Parity tests pass, and updated README with new API members.

## PLAYER v0.33.1
- ✅ Completed: Fix Player Metadata - Synced package.json version with status file (0.5.2 -> 0.33.1) and updated @helios-project/core dependency to 2.7.0.

## PLAYER v0.33.0
- ✅ Completed: Deep API Parity - Implemented `videoWidth`, `videoHeight`, `buffered`, `seekable`, `seeking` properties on `<helios-player>` for compatibility with third-party wrappers.

## PLAYER v0.32.2
- ✅ Completed: Polish Click-To-Play & Fix Z-Index - Fixed bug where controls were blocked by click-layer and ensured player grabs focus on click.

## PLAYER v0.32.1
- ✅ Completed: Fix Player Dependencies - Updated @helios-project/core dependency and fixed build environment to enable verification.

## PLAYER v0.32.0
- ✅ Completed: Implement Standard Media States - Added `readyState`, `networkState` properties and constants, along with lifecycle events (`loadstart`, `loadedmetadata`, `canplay`, `canplaythrough`) to `<helios-player>`.

## PLAYER v0.31.0
- ✅ Completed: Implement Standard Media API properties - Added missing properties `src`, `autoplay`, `loop`, `controls`, `poster`, `preload` to `HeliosPlayer` class to fully comply with HTMLMediaElement interface expectations. Updated `observedAttributes` to include `preload`. Updated dependencies to fix build issues.

## PLAYER v0.30.0
- ✅ Completed: Audio Export Enhancements - Implemented `loop` and `startTime` support for client-side audio export, plus declarative `volume` attribute parsing.

## PLAYER v0.29.0
- ✅ Completed: Interactive Mode - Implemented `interactive` attribute to toggle between standard video controls and direct iframe interaction.

## PLAYER v0.28.0
- ✅ Completed: Harden Player Connection - Implemented polling logic for Direct Mode connection to handle asynchronous composition initialization.

## PLAYER v0.27.0
- ✅ Completed: Implement Muted Attribute - Added support for the `muted` attribute to `<helios-player>`, enabling declarative control of audio mute state.

## PLAYER v0.26.0
- ✅ Completed: Bridge Error Propagation - Implemented global error handling in `bridge.ts` and `HeliosController`, enabling the player UI to display runtime errors from the composition.

## PLAYER v0.25.2
- ✅ Completed: Polish Burn-In Captions - Added text shadow to exported captions to match player UI styling and improved code hygiene by preventing canvas state leaks.

## PLAYER v0.25.1
- ✅ Completed: Refine Burn-In Captions - Added multiline caption support and respect for player caption visibility toggle during client-side export.

## PLAYER v0.25.0
- ✅ Completed: Responsive Controls - Implemented `ResizeObserver` to adapt player controls for smaller widths (compact/tiny modes) to prevent overflow.

## PLAYER v0.24.1
- ✅ Completed: Documentation Update - Added missing attributes (poster, preload, input-props), Standard Media API, and Events documentation to README.
- ✅ Completed: Implement Poster and Preload - Implemented `poster` attribute for custom preview images and `preload` attribute to control loading behavior (including deferred loading with "Big Play Button").
- ✅ Completed: Implement Input Props - Implemented `input-props` attribute/property on `<helios-player>` to pass dynamic data to the composition controller.
- ✅ Completed: Export Burn-In Captions - Implemented caption rendering (burn-in) for client-side export using intermediate OffscreenCanvas.
- ✅ Completed: Video Inlining - Implemented `inlineVideos` to capture `<video>` elements as images during client-side export, ensuring visual fidelity.
- ✅ Completed: Project Cleanup - Added explicit `vitest` dependency and removed obsolete plan file.
- ✅ Completed: Client Side Audio Volume - Updated exporter to respect `volume` and `muted` attributes of audio elements during client-side export.
- ✅ Completed: Verify WebM Export - Verified that WebM export functionality works correctly by running tests and ensuring dependencies are installed.
- ✅ Completed: Implement Standard Media API - Implemented standard media properties (currentTime, duration, etc.) and events (play, pause, timeupdate) for improved interoperability.
- ✅ Completed: WebM Export - Implemented `export-format` attribute to support WebM (VP9/Opus) video export alongside MP4.
- ✅ Completed: Touch Support - Added touch event listeners to the scrubber to support smooth seeking on mobile devices.
- ✅ Completed: Implement Captions - Added caption rendering overlay and "CC" toggle button to `<helios-player>`, leveraging `activeCaptions` from core state.
- ✅ Completed: Volume Controls - Implemented volume slider and mute button in UI, updated controllers and bridge protocol.
- ✅ Completed: Export UX - Implemented Error Overlay with "Dismiss" action for client-side export failures, providing visibility into errors like unsupported codecs.
- ✅ Completed: Accessibility Improvements - Implemented ARIA labels and roles for controls, including dynamic updates for play state and scrubber time.
- ✅ Completed: Frame-by-Frame Controls - Implemented `.`/`,` for single-frame stepping and updated Arrow keys to default to 1 frame (10 with Shift).
- ✅ Completed: Scrubber UX - Implemented improved scrubber interaction (pause on scrub, anti-jitter) to ensure smooth seeking without fighting the update loop.
- ✅ Completed: Dom Canvas Capture - Implemented `inlineCanvases` to replace `<canvas>` elements with data-URI images during DOM export, ensuring mixed content is preserved.
- ✅ Completed: Lock UI During Export - Disabled playback controls and keyboard shortcuts during client-side export to ensure data integrity.
- ✅ Completed: Bridge Documentation - Added README.md and improved connection error message to guide users towards `connectToParent`.
- ✅ Completed: CSS Asset Inlining - Implemented parsing and inlining of assets (images, fonts) referenced in CSS via `url()` as Data URIs for robust DOM export.
- ✅ Completed: Client-Side Image Inlining - Implemented fetching and inlining of `<img>` and `background-image` sources as Data URIs for robust DOM export.
- ✅ Completed: Scaffold Tests (Update) - Added tests for invalid VideoEncoder configurations and verified test suite.
- ✅ Completed: Client Side Audio - Implemented audio capture, mixing (OfflineAudioContext), and encoding (AAC) for client-side export.
- ✅ Completed: Enable External Stylesheets - Updated DOM capture to fetch and inline external CSS (`<link rel="stylesheet">`) for high-fidelity exports.
- ✅ Completed: Keyboard & Fullscreen Support - Implemented standard keyboard shortcuts (Space, F, Arrows) and Fullscreen UI/logic.
- ✅ Completed: Scaffold Tests - Added unit test suite for controllers and exporter using Vitest.
- ✅ Completed: Standard Attributes - Implemented `autoplay`, `loop`, and `controls` attributes. Synced version and artifacts.
- ✅ Completed: Dynamic Sizing - Implemented `observedAttributes` for `src`, `width`, and `height` to allow dynamic player updates.
- ✅ Completed: Robust DOM Export - Implemented XMLSerializer/SVG-based DOM capture for high-fidelity export in Direct and Bridge modes.
- ✅ Completed: Sync player state with engine state - Updated Bridge Protocol to include initial state in handshake.
- ✅ Completed: Variable Speed - Added `setPlaybackRate` to `HeliosController` and Speed Selector UI to `<helios-player>`.
- ✅ Completed: Loading UI - Verified implementation of loading and error state overlays.
- ✅ Completed: Export Config - Added `export-mode` and `canvas-selector` attributes for explicit export control.
- ✅ Completed: Refactor Player Export - Extracted `ClientSideExporter`, added cancellation support, and modularized controllers.
- ✅ Completed: Sandbox and Bridge - Implemented `postMessage` bridge and sandboxed iframe support.
- ✅ Completed: Refactor Player Control Logic - Verified `<helios-player>` uses `window.helios` and supports client-side export.
