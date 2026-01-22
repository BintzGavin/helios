# Context: System

## Section A: Milestones
### 1. Canvas MVP End-to-End
- [x] Implement `HeliosEngine` core logic (Timeline, State).
- [x] Create a basic Canvas rendering example (using Helios core).
- [x] Implement `renderFrames` function in renderer.
- [x] Wire up FFmpeg for video output.
- [x] Create a CLI entry point for rendering.
- [ ] Refactor `Renderer` to use `WebCodecs` (High Performance) instead of `toDataURL` (current MVP).
- [ ] Add test script to packages/core.

### 2. DOM to Video Path
- [ ] Implement Playwright capture loop for DOM elements.
- [ ] Handle asset preloading.

### 3. In-Browser Player Polish
- [x] Ensure `<helios-player>` works with `HeliosEngine`.
- [ ] Sync player state with engine state.
- [x] Implement robust Client-Side Export (WebCodecs) using the correct `seek` mechanism.
- [ ] Add proper UI feedback for "Loading" state.

### 4. Diagnostics and GPU Detection
- [x] Implement `helios.diagnose()` for environment checks.

### 5. Documentation and Examples
- [ ] Add Quickstart guide.
- [ ] Add realistic examples (Canvas and DOM).

### 6. Distributed Rendering Research
- [ ] Scaffolding for distributed rendering.

## Section B: Role Boundaries
- **Core**: Logic Engine. Pure TypeScript. Never imports Renderer or Player.
- **Renderer**: Rendering Pipeline (Playwright + FFmpeg). Node.js environment.
- **Player**: Web Component. Browser environment.

## Section C: Shared Build Commands
- `npm run build:examples`: Builds the example compositions.
- `npm run build`: Builds the renderer package.
- `npm run build -w packages/player`: Builds the player package.
