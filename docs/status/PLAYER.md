<<<<<<< HEAD
# Player Status

[2024-03-20] ✅ Completed: Refactor HeliosPlayer to use Strategy Pattern for Export - Implemented `ExportStrategy`, `CanvasExportStrategy`, and `DomExportStrategy`. Refactored `HeliosPlayer` to use these strategies, improving code organization and separation of concerns.
=======
# Status: PLAYER

## Identity
- **Role**: Frontend / Player Agent
- **Domain**: `packages/player`
- **Responsibility**: `<helios-player>` Web Component, UI controls, iframe bridge.

## Current State
- `<helios-player>` exists but uses a hardcoded, non-standard contract (`updateAnimationAtTime`) to communicate with the iframe.
- The standard composition example (`examples/simple-canvas-animation/composition.html`) exposes `window.helios` but does not implement `updateAnimationAtTime`.
- Consequently, the Player cannot currently control or preview the example composition.

## Critical Task
- **Refactor Player Control Logic**: Update `HeliosPlayer` to detect and drive `window.helios` inside the iframe. This aligns the Player with the "Headless Logic Engine" architecture.

## Backlog
- [ ] Refactor `HeliosPlayer` to support `window.helios`.
- [ ] Implement robust Client-Side Export (WebCodecs) using the correct `seek` mechanism.
- [ ] Add proper UI feedback for "Loading" state.
>>>>>>> origin/main
