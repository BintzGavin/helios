**Version**: 0.3.0

# Status: PLAYER

## Identity
- **Role**: Frontend / Player Agent
- **Domain**: `packages/player`
- **Responsibility**: `<helios-player>` Web Component, UI controls, iframe bridge.

## Current State
- `<helios-player>` uses a modular architecture with `HeliosController` (Direct/Bridge) and `ClientSideExporter`.
- Client-side export supports explicit configuration via `export-mode` and `canvas-selector` attributes.
- Supports sandboxed iframes and cross-origin usage via `postMessage` bridge.

## Critical Task
- **None**: Feature complete.

## Backlog
- [x] Refactor `HeliosPlayer` to support `window.helios`.
- [x] Implement robust Client-Side Export (WebCodecs) using the correct `seek` mechanism.
- [x] Implement Sandbox and Bridge support.
- [x] Refactor Export logic into dedicated `ClientSideExporter` with cancellation.
- [x] Implement Export Configuration (`export-mode`, `canvas-selector`).
- [ ] Add proper UI feedback for "Loading" state.

[2026-01-20] ✅ Completed: Refactor Player Control Logic - Verified `<helios-player>` uses `window.helios` and supports client-side export.
[2026-01-21] ✅ Completed: Sandbox and Bridge - Implemented `postMessage` bridge and sandboxed iframe support.
[v0.2.0] ✅ Completed: Refactor Player Export - Extracted `ClientSideExporter`, added cancellation support, and modularized controllers.
[v0.3.0] ✅ Completed: Export Config - Added `export-mode` and `canvas-selector` attributes for explicit export control.
