# Helios Project Progress Log

## 2026-01-15

### Observations
- Repository is initialized with `packages/core`, `packages/player`, and `packages/renderer`.
- `README.md` outlines the architecture clearly: Canvas MVP is the priority.
- No `docs/` folder existed, so I am creating it.
- `docs/BACKLOG.md` needs to be created.
- The `Helios` core class existed but was unused in the renderer/example flow.
- The example used manual `document.timeline` polling.
- `file://` protocol limitations caused issues with module imports in the renderer.

### Today's Focus
- Initialize project tracking (`docs/PROGRESS.md`, `docs/BACKLOG.md`).
- Implement "Canvas MVP end to end" with proper architecture.
- Integrate `Helios` core into the rendering flow.

### Changes
- **Core**: Updated `Helios` class in `packages/core` to support `bindToDocumentTimeline()`. Added unit tests.
- **Renderer**: Updated `Renderer` to support local file access (`--disable-web-security`) and use built examples.
- **Examples**: Refactored `simple-canvas-animation` to use `Helios` core.
- **Build**: Added `vite.build-example.config.js` and `npm run build:examples` to properly bundle examples for the renderer.
- **Docs**: Created `docs/decisions/2026-01-15-canvas-mvp-refactor.md`.

### Next Up
- **DOM to Video Path**: Now that Canvas MVP is solid, we can look at the DOM path.
- **In-browser Player**: Ensure the player component works with the new `Helios` build.
- **Diagnostics**: Add `helios.diagnose()` to help users debug environment issues.

## [2026-01-21] Daily Report

### Core
- ✅ Completed: Implement Helios.diagnose() - Implemented static diagnose method and DiagnosticReport interface

## [2026-02-18] Consolidated Report

### Core
- [2026-01-22] ✅ Completed: Enable Core Testing And Robustness - Added `test` script, constructor validation, and unit tests.

### Renderer
- [2026-02-18] ✅ Completed: Refactor FFmpeg Config - Fully decoupled FFmpeg argument generation by moving it to `RenderStrategy.getFFmpegArgs` and extracted `RendererOptions` to `types.ts`.

### Player
- [2026-01-20] ✅ Completed: Refactor Player Control Logic - Verified `<helios-player>` uses `window.helios` and supports client-side export.
- [2026-01-21] ✅ Completed: Sandbox and Bridge - Implemented `postMessage` bridge and sandboxed iframe support.

### Demo
- [2026-01-22] ✅ Completed: Verify Vue Example - Verified build and render of `examples/vue-canvas-animation`. Created `tests/e2e/verify-render.ts`.

## STUDIO v0.1.0
- ✅ Completed: Scaffold Studio Package - Created package structure, config, and basic UI.
