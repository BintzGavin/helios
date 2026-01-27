# PLAYER Progress Log

## PLAYER v0.25.0
- ✅ Completed: Responsive Controls - Implemented `ResizeObserver` to adapt player controls for smaller widths (compact/tiny modes) to prevent overflow.

## PLAYER v0.24.1
- ✅ Completed: Documentation Update - Added missing attributes (poster, preload, input-props), Standard Media API, and Events documentation to README.

## PLAYER v0.24.0
- ✅ Completed: Implement Poster and Preload - Implemented `poster` attribute for custom preview images and `preload` attribute to control loading behavior (including deferred loading with "Big Play Button").

## PLAYER v0.23.0
- ✅ Completed: Implement Input Props - Implemented `input-props` attribute/property on `<helios-player>` to pass dynamic data to the composition controller.

## PLAYER v0.22.0
- ✅ Completed: Export Burn-In Captions - Implemented caption rendering (burn-in) for client-side export using intermediate OffscreenCanvas.

## PLAYER v0.21.0
- ✅ Completed: Video Inlining - Implemented `inlineVideos` to capture `<video>` elements as images during client-side export, ensuring visual fidelity.

## PLAYER v0.20.1
- ✅ Completed: Project Cleanup - Added explicit `vitest` dependency and removed obsolete plan file.

## PLAYER v0.20.0
- ✅ Completed: Client Side Audio Volume - Updated exporter to respect `volume` and `muted` attributes of audio elements during client-side export.

## PLAYER v0.19.1
- ✅ Completed: Verify WebM Export - Verified that WebM export functionality works correctly by running tests and ensuring dependencies are installed.

## PLAYER v0.19.0
- ✅ Completed: Implement Standard Media API - Implemented standard media properties (currentTime, duration, etc.) and events (play, pause, timeupdate) for improved interoperability.

## PLAYER v0.18.0
- ✅ Completed: WebM Export - Implemented `export-format` attribute to support WebM (VP9/Opus) video export alongside MP4.

## PLAYER v0.17.1
- ✅ Completed: Touch Support - Added touch event listeners to the scrubber to support smooth seeking on mobile devices.

## PLAYER v0.17.0
- ✅ Completed: Implement Captions - Added caption rendering overlay and "CC" toggle button to `<helios-player>`, leveraging `activeCaptions` from core state.

## PLAYER v0.16.0
- ✅ Completed: Volume Controls - Implemented volume slider and mute button in UI, updated controllers and bridge protocol.

## PLAYER v0.15.0
- ✅ Completed: Export UX - Implemented Error Overlay with "Dismiss" action for client-side export failures, providing visibility into errors like unsupported codecs.

## PLAYER v0.14.0
- ✅ Completed: Accessibility Improvements - Implemented ARIA labels and roles for controls, including dynamic updates for play state and scrubber time.

## PLAYER v0.13.0
- ✅ Completed: Frame-by-Frame Controls - Implemented `.`/`,` for single-frame stepping and updated Arrow keys to default to 1 frame (10 with Shift).

## PLAYER v0.12.0
- ✅ Completed: Scrubber UX - Implemented improved scrubber interaction (pause on scrub, anti-jitter) to ensure smooth seeking without fighting the update loop.

## PLAYER v0.11.1
- ✅ Completed: Dom Canvas Capture - Implemented `inlineCanvases` to replace `<canvas>` elements with data-URI images during DOM export, ensuring mixed content is preserved.

## PLAYER v0.11.0
- ✅ Completed: Lock UI During Export - Disabled playback controls and keyboard shortcuts during client-side export to ensure data integrity.

## PLAYER v0.10.1
- ✅ Completed: Bridge Documentation - Added README.md and improved connection error message to guide users towards `connectToParent`.

## PLAYER v0.10.0
- ✅ Completed: CSS Asset Inlining - Implemented parsing and inlining of assets (images, fonts) referenced in CSS via `url()` as Data URIs for robust DOM export.

## PLAYER v0.9.0
- ✅ Completed: Client-Side Image Inlining - Implemented fetching and inlining of `<img>` and `background-image` sources as Data URIs for robust DOM export.

## PLAYER v0.8.1
- ✅ Completed: Scaffold Tests (Update) - Added tests for invalid VideoEncoder configurations and verified test suite.

## PLAYER v0.8.0
- ✅ Completed: Client Side Audio - Implemented audio capture, mixing (OfflineAudioContext), and encoding (AAC) for client-side export.

## PLAYER v0.7.0
- ✅ Completed: Enable External Stylesheets - Updated DOM capture to fetch and inline external CSS (`<link rel="stylesheet">`) for high-fidelity exports.

## PLAYER v0.6.0
- ✅ Completed: Keyboard & Fullscreen Support - Implemented standard keyboard shortcuts (Space, F, Arrows) and Fullscreen UI/logic.

## PLAYER v0.5.2
- ✅ Completed: Scaffold Tests - Added unit test suite for controllers and exporter using Vitest.

## PLAYER v0.5.1
- ✅ Completed: Standard Attributes - Implemented `autoplay`, `loop`, and `controls` attributes. Synced version and artifacts.

## PLAYER v0.5.0
- ✅ Completed: Dynamic Sizing - Implemented `observedAttributes` for `src`, `width`, and `height` to allow dynamic player updates.

## PLAYER v0.4.0
- ✅ Completed: Robust DOM Export - Implemented XMLSerializer/SVG-based DOM capture for high-fidelity export in Direct and Bridge modes.

## PLAYER v0.3.3
- ✅ Completed: Sync player state with engine state - Updated Bridge Protocol to include initial state in handshake.

## PLAYER v0.3.2
- ✅ Completed: Variable Speed - Added `setPlaybackRate` to `HeliosController` and Speed Selector UI to `<helios-player>`.

## PLAYER v0.3.1
- ✅ Completed: Loading UI - Verified implementation of loading and error state overlays.

## PLAYER v0.3.0
- ✅ Completed: Export Config - Added `export-mode` and `canvas-selector` attributes for explicit export control.

## PLAYER v0.2.0
- ✅ Completed: Refactor Player Export - Extracted `ClientSideExporter`, added cancellation support, and modularized controllers.

## [2026-01-21] PLAYER
- ✅ Completed: Sandbox and Bridge - Implemented `postMessage` bridge and sandboxed iframe support.

## [2026-01-20] PLAYER
- ✅ Completed: Refactor Player Control Logic - Verified `<helios-player>` uses `window.helios` and supports client-side export.
