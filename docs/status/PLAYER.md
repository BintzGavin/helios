**Version**: 0.4.0

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
- Implements Robust DOM Export using XMLSerializer and SVG foreignObject.

## Critical Task
- **None**: Feature complete.

## Backlog
- [x] Sync player state with engine state (Bridge Initialization Fix).
- [x] Implement Variable Playback Speed controls (API + UI).
- [x] Refactor `HeliosPlayer` to support `window.helios`.
- [x] Implement robust Client-Side Export (WebCodecs) using the correct `seek` mechanism.
- [x] Implement Sandbox and Bridge support.
- [x] Refactor Export logic into dedicated `ClientSideExporter` with cancellation.
- [x] Implement Export Configuration (`export-mode`, `canvas-selector`).
- [x] Add proper UI feedback for "Loading" state.

[2026-01-20] ✅ Completed: Refactor Player Control Logic - Verified `<helios-player>` uses `window.helios` and supports client-side export.
[2026-01-21] ✅ Completed: Sandbox and Bridge - Implemented `postMessage` bridge and sandboxed iframe support.
[v0.2.0] ✅ Completed: Refactor Player Export - Extracted `ClientSideExporter`, added cancellation support, and modularized controllers.
[v0.3.0] ✅ Completed: Export Config - Added `export-mode` and `canvas-selector` attributes for explicit export control.
[v0.3.1] ✅ Completed: Loading UI - Verified implementation of loading and error state overlays.
[v0.3.2] ✅ Completed: Variable Speed - Added `setPlaybackRate` to `HeliosController` and Speed Selector UI to `<helios-player>`.
[v0.3.3] ✅ Completed: Sync player state with engine state - Updated Bridge Protocol to include initial state in handshake.
[v0.4.0] ✅ Completed: Robust DOM Export - Implemented XMLSerializer/SVG-based DOM capture for high-fidelity export in Direct and Bridge modes.
