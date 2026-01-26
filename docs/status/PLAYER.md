**Version**: 0.13.0

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

## Critical Task
- **Frame-by-Frame Controls**: Implement `.`/`,` shortcuts and refine Arrow key behavior for single-frame stepping. Plan: `/.sys/plans/2026-02-27-PLAYER-Frame-By-Frame-Controls.md`.

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

[2026-01-20] ✅ Completed: Refactor Player Control Logic - Verified `<helios-player>` uses `window.helios` and supports client-side export.
[2026-01-21] ✅ Completed: Sandbox and Bridge - Implemented `postMessage` bridge and sandboxed iframe support.
[v0.2.0] ✅ Completed: Refactor Player Export - Extracted `ClientSideExporter`, added cancellation support, and modularized controllers.
[v0.3.0] ✅ Completed: Export Config - Added `export-mode` and `canvas-selector` attributes for explicit export control.
[v0.3.1] ✅ Completed: Loading UI - Verified implementation of loading and error state overlays.
[v0.3.2] ✅ Completed: Variable Speed - Added `setPlaybackRate` to `HeliosController` and Speed Selector UI to `<helios-player>`.
[v0.3.3] ✅ Completed: Sync player state with engine state - Updated Bridge Protocol to include initial state in handshake.
[v0.4.0] ✅ Completed: Robust DOM Export - Implemented XMLSerializer/SVG-based DOM capture for high-fidelity export in Direct and Bridge modes.
[v0.5.0] ✅ Completed: Dynamic Sizing - Implemented `observedAttributes` for `src`, `width`, and `height` to allow dynamic player updates.
