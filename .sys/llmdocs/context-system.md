# Context: System & Operations

## A. Milestones (Backlog)
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

### 4. Diagnostics and GPU Detection
- [ ] Implement `helios.diagnose()` for environment checks.

### 5. Documentation and Examples
- [ ] Add Quickstart guide.
- [ ] Add realistic examples (Canvas and DOM).

### 6. Distributed Rendering Research
- [ ] Scaffolding for distributed rendering.

## B. Role Boundaries
1.  **Core**: Pure TypeScript logic. No DOM manipulation (except via optional bindings). Zero dependencies on Renderer or Player.
2.  **Renderer**: Node.js environment only. Controls the Browser via Playwright. Imports `core` for type definitions or shared logic if needed, but primarily orchestrates the process.
3.  **Player**: Browser-native Web Component. Controls `core` instances inside an iframe.
4.  **Examples**: Standalone Vite apps. Must be buildable via `npm run build:examples` for the Renderer to consume.

## C. Shared Build Commands
-   `npm run build:examples`: Builds the example compositions into `output/example-build` for consumption by the Renderer.
-   `npm run dev`: Starts the development server for the active example.
-   `npm run diagnose`: Checks for FFmpeg and Playwright availability.
