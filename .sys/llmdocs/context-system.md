# Context: System & Constraints

## A. Milestones (from BACKLOG)
### 1. Canvas MVP End-to-End
- [x] Implement `HeliosEngine` core logic (Timeline, State).
- [x] Create a basic Canvas rendering example (using Helios core).
- [x] Implement `renderFrames` function in renderer.
- [x] Wire up FFmpeg for video output.
- [x] Create a CLI entry point for rendering.
- [ ] Refactor `Renderer` to use `WebCodecs` (High Performance) instead of `toDataURL` (current MVP).

### 2. DOM to Video Path
- [ ] Implement Playwright capture loop for DOM elements.
- [ ] Handle asset preloading.

### 3. In-Browser Player Polish
- [ ] Ensure `<helios-player>` works with `HeliosEngine`.
- [ ] Sync player state with engine state.
- [ ] Implement robust Client-Side Export (WebCodecs) using the correct `seek` mechanism.
- [ ] Add proper UI feedback for "Loading" state.

### 4. Diagnostics and GPU Detection
- [ ] Implement `helios.diagnose()` for environment checks.

### 5. Documentation and Examples
- [ ] Add Quickstart guide.
- [ ] Add realistic examples (Canvas and DOM).

### 6. Distributed Rendering Research
- [ ] Scaffolding for distributed rendering.

## B. Role Boundaries
- **Core Agent**: Manages `packages/core`. Pure logic/state. Never imports Renderer or Player.
- **Renderer Agent**: Manages `packages/renderer`. Node.js/Playwright context. Imports Core (types/logic).
- **Player Agent**: Manages `packages/player`. Browser/Web Component context. Imports Core.
- **Scribe Agent**: Manages `docs/`. Read-only access to code.

## C. Shared Build Commands
- `npm run dev`: Start the dev server for examples (usually `simple-canvas-animation`).
- `npm run build:examples`: Build the examples using Vite (required before rendering).
- `npm run render:canvas-example`: Build examples and run the renderer script.
