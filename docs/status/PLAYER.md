# Status: PLAYER

## Identity
- **Role**: Frontend / Player Agent
- **Domain**: `packages/player`
- **Responsibility**: `<helios-player>` Web Component, UI controls, iframe bridge.

## Current State
- `<helios-player>` correctly drives the `Helios` instance exposed by the composition (via `window.helios`).
- Client-side export using WebCodecs is implemented, driving the animation frame-by-frame via `seek()`.
- The Player acts as a "Remote Control" for the headless logic engine inside the iframe.
- **New**: Supports sandboxed iframes and cross-origin usage via `postMessage` bridge.

## Critical Task
- **None**: Bridge implementation complete.

## Backlog
- [x] Refactor `HeliosPlayer` to support `window.helios`.
- [x] Implement robust Client-Side Export (WebCodecs) using the correct `seek` mechanism.
- [x] Implement Sandbox and Bridge support.
- [ ] Add proper UI feedback for "Loading" state.

[2026-01-20] ✅ Completed: Refactor Player Control Logic - Verified `<helios-player>` uses `window.helios` and supports client-side export.
[2026-01-21] ✅ Completed: Sandbox and Bridge - Implemented `postMessage` bridge and sandboxed iframe support.
