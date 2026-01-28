**Version**: v0.27.0

# Status: PLAYER

## Identity
- **Role**: Frontend / Player Agent
- **Domain**: `packages/player`
- **Responsibility**: `<helios-player>` Web Component, UI controls, iframe bridge.

## Current State
- `<helios-player>` uses a modular architecture with `HeliosController` (Direct/Bridge) and `ClientSideExporter`.
- Client-side export supports explicit configuration via `export-mode` and `canvas-selector` attributes.
- Supports sandboxed iframes and cross-origin usage via `postMessage` bridge.
- Includes visual feedback for loading and error states (connection timeouts).
- Supports variable playback speed via UI and Controller API.
- Implements Robust DOM Export using XMLSerializer and SVG foreignObject, including external stylesheets.
- Supports dynamic sizing via `width`/`height` attributes and `src` changes.
- Supports standard keyboard shortcuts (Space/K, F, Arrows) and Fullscreen toggle.
- Supports frame-by-frame navigation via `.` and `,` keys, and Shift modifier for 10-frame jumps.
- Displays actionable error messages with "Dismiss" option for failed client-side exports.
- Supports Volume and Mute controls via UI and Bridge.
- Supports caption rendering overlay with toggleable "CC" button.
- Supports WebM (VP9/Opus) client-side export via `export-format` attribute.
- Implements Standard Media API (play, pause, currentTime, events) for better interoperability.
- Client-side audio export respects `volume` and `muted` properties of audio elements.
- Client-side export (DOM mode) now inlines `<video>` elements as static images, ensuring they are visible in the exported output.
- Supports declarative data binding via `input-props` attribute (JSON string) and property, enabling dynamic composition updates.
- Supports `poster` and `preload` attributes. `preload="none"` defers iframe loading until the user interacts with the new "Big Play Button".
- Implements responsive controls using `ResizeObserver`, adapting UI layout for smaller widths (hiding volume/speed controls).
- **New**: Implemented `muted` attribute support on `<helios-player>` to control initial mute state and reflect changes, closing a Standard Media API gap.

## Critical Task
- **None**: Recent task completed.

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

## Backlog
- [x] Implement Standard Media API (play, pause, currentTime, events).
- [x] Implement Caption Rendering.
- [x] Implement Volume Controls.
- [x] Implement Client Side Audio Export.
- [x] Implement Dynamic Sizing & Reactive Attributes.
- [x] Sync player state with engine state (Bridge Initialization Fix).
- [x] Implement Variable Playback Speed controls (API + UI).
- [x] Refactor `HeliosPlayer` to support `window.helios`.
- [x] Implement robust Client-Side Export (WebCodecs) using the correct `seek` mechanism.
- [x] Implement Sandbox and Bridge support.
- [x] Refactor Export logic into dedicated `ClientSideExporter` with cancellation.
- [x] Implement Export Configuration (`export-mode`, `canvas-selector`).
- [x] Add proper UI feedback for "Loading" state.
- [x] Enable External Stylesheets for DOM Export.
- [x] Enable Image Inlining for DOM Export.
- [x] Enable CSS Asset Inlining for DOM Export.
- [x] Enable Canvas Inlining for DOM Export.
- [x] Enable Video Inlining for DOM Export.
- [x] Implement Bridge Error Propagation.

[2026-01-20] ✅ Completed: Refactor Player Control Logic - Verified `<helios-player>` uses `window.helios` and supports client-side export.
[2026-01-21] ✅ Completed: Sandbox and Bridge - Implemented `postMessage` bridge and sandboxed iframe support.
[v0.2.0] ✅ Completed: Refactor Player Export - Extracted `ClientSideExporter`, added cancellation support, and modularized controllers.
[v0.3.0] ✅ Completed: Export Config - Added `export-mode` and `canvas-selector` attributes for explicit export control.
[v0.3.1] ✅ Completed: Loading UI - Verified implementation of loading and error state overlays.
[v0.3.2] ✅ Completed: Variable Speed - Added `setPlaybackRate` to `HeliosController` and Speed Selector UI to `<helios-player>`.
[v0.3.3] ✅ Completed: Sync player state with engine state - Updated Bridge Protocol to include initial state in handshake.
[v0.4.0] ✅ Completed: Robust DOM Export - Implemented XMLSerializer/SVG-based DOM capture for high-fidelity export in Direct and Bridge modes.
[v0.5.0] ✅ Completed: Dynamic Sizing - Implemented `observedAttributes` for `src`, `width`, and `height` to allow dynamic player updates.
