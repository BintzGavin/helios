# Progress Log

## 2026-01-15 (Current Run)

### Observations
- Repository is a monorepo with `core`, `player`, and `renderer`.
- `README.md` outlines the architecture clearly: Monorepo, Core Engine, Renderer (Canvas/DOM), Player.
- `packages/core` contains a basic `Helios` class with state management and a simple rAF loop.
- `docs/BACKLOG.md` was missing, created it.

### Today's Focus
- **Canvas MVP End-to-End**: My goal is to get a basic canvas composition rendering to video.
- I will refine `HeliosEngine` (currently `Helios` in `core`) to support the concept of "rendering" vs "playing". The current `tick` is `requestAnimationFrame` based, which is fine for the player but the renderer needs to drive the timeline deterministically.
- I need to verify `packages/renderer` exists and has the necessary scaffolding.
- I will try to create a "Canvas MVP" that:
    1.  Uses `core` to manage state.
    2.  Has a `renderer` that can take a `Helios` instance and a canvas drawing function, and output frames.

### Planned Changes
1.  Explore `packages/renderer`.
2.  Update `core` if needed to support deterministic rendering (it seems `seek` is enough for now).
3.  Create a basic example in `examples/` that uses `core`.
4.  Implement a basic CLI in `renderer` or a script to render that example.

### Executed Changes
1.  **Created `examples/canvas-basic`**: A simple HTML canvas example that uses `Helios` from `core` to manage animation state and drive a rotation/color animation.
2.  **Refined `packages/renderer`**: Updated the Playwright evaluation loop to:
    -   Look for `window.helios` to perform deterministic seeking via `seek(frame)`.
    -   Fall back to `document.timeline.currentTime` if `helios` is not found.
    -   Capture canvas frames using `toDataURL` and pipe them to FFmpeg.
3.  **Created `packages/renderer/scripts/render-canvas.ts`**: A script that runs the renderer against the local Vite server.
4.  **Verified End-to-End**: Successfully rendered `examples/canvas-basic` to `output.mp4` (115KB).

### Next Up
- **Clean up the CLI**: The current script hardcodes the URL. It should probably take arguments.
- **Improve Renderer Performance**: `toDataURL` is slow. Evaluate `screenshot` vs `toDataURL` vs WebCodecs.
- **DOM Rendering**: The `renderer` class is generic but currently biased towards canvas. We should add the DOM capture path.
