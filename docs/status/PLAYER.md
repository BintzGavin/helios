**Version**: 0.7.0

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

## Critical Task
- **None**: Recent critical task completed. Await next assignment.

[v0.7.0] ✅ Completed: Enable External Stylesheets - Updated DOM capture to fetch and inline external CSS (`<link rel="stylesheet">`) for high-fidelity exports.
[v0.6.0] ✅ Completed: Keyboard & Fullscreen Support - Implemented standard keyboard shortcuts (Space, F, Arrows) and Fullscreen UI/logic.
[v0.5.2] ✅ Completed: Scaffold Tests - Added unit test suite for controllers and exporter using Vitest.
[v0.5.1] ✅ Completed: Standard Attributes - Implemented `autoplay`, `loop`, and `controls` attributes. Synced version and artifacts.

## Backlog
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

[2026-01-20] ✅ Completed: Refactor Player Control Logic - Verified `<helios-player>` uses `window.helios` and supports client-side export.
[2026-01-21] ✅ Completed: Sandbox and Bridge - Implemented `postMessage` bridge and sandboxed iframe support.
[v0.2.0] ✅ Completed: Refactor Player Export - Extracted `ClientSideExporter`, added cancellation support, and modularized controllers.
[v0.3.0] ✅ Completed: Export Config - Added `export-mode` and `canvas-selector` attributes for explicit export control.
[v0.3.1] ✅ Completed: Loading UI - Verified implementation of loading and error state overlays.
[v0.3.2] ✅ Completed: Variable Speed - Added `setPlaybackRate` to `HeliosController` and Speed Selector UI to `<helios-player>`.
[v0.3.3] ✅ Completed: Sync player state with engine state - Updated Bridge Protocol to include initial state in handshake.
[v0.4.0] ✅ Completed: Robust DOM Export - Implemented XMLSerializer/SVG-based DOM capture for high-fidelity export in Direct and Bridge modes.
[v0.5.0] ✅ Completed: Dynamic Sizing - Implemented `observedAttributes` for `src`, `width`, and `height` to allow dynamic player updates.
