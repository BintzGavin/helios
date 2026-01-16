# 2026-01-15 - Canvas Render MVP

## Problem Statement
We need to validate the core architectural premise of Helios: driving a composition via a timeline and rendering it to video. Currently, `packages/renderer` has a rough implementation, but it's not wired up to a concrete example, and the `core` engine logic is basic.

## Context
- **Core**: Contains `Helios` class for state.
- **Renderer**: Uses Playwright + FFmpeg. It assumes a `canvas` exists and `document.timeline.currentTime` works (which implies WAAPI or a polyfill that listens to it).
- **Goal**: Render a simple canvas animation to an MP4 file.

## Options Considered
1.  **Pure Node.js Canvas**: Use `node-canvas`. *Rejected*: Helios goal is to use browser technologies (WebCodecs, etc.) and be framework agnostic in the browser context. We want to render *what the user sees in the browser*.
2.  **Playwright Screenshot**: Capture full page screenshots. *Rejected for Canvas MVP*: Too slow.
3.  **Playwright Canvas `toDataURL`**: Current approach in `renderer`. Slow but works for MVP.
4.  **WebCodecs**: The "High Performance" path in README. *Out of scope for today*: Requires HTTPS or specific flags, and more complex setup. `toDataURL` is fine for the "Hello World" of rendering.

## Chosen Approach
We will stick with the **Playwright Canvas `toDataURL`** approach for today as a "functional" MVP, even if slow. It proves the pipeline.

**Plan:**
1.  **Create an Example**: `examples/canvas-basic`. It will use `packages/core` to drive a canvas animation.
    - It needs to listen to `Helios` state or just update the canvas based on time.
    - IMPORTANT: The renderer currently sets `document.timeline.currentTime`. The example needs to respect this OR the renderer needs to call `helios.seek()`.
    - *Decision*: The Renderer should ideally interact with the `Helios` instance if possible, but generic `document.timeline.currentTime` is the "standard" way for WAAPI. For Canvas, we need a bridge.
    - *Bridge*: The example will expose a global `seekTo(time)` function or similar, OR the renderer acts as the "master" and the page just reacts to time.
    - *Simpler*: The renderer in `src/index.ts` currently does:
      ```js
      (document.timeline as any).currentTime = timeValue;
      ```
      This only works for WAAPI. For a canvas example, we need to bind that to the canvas draw loop.
      So `examples/canvas-basic` should have a loop that draws based on `document.timeline.currentTime` if available, or falls back to internal state.

2.  **Refine Renderer**:
    - Make it more robust.
    - Ensure it waits for the page to be ready.

3.  **CLI/Script**:
    - Create a script in `packages/renderer` (or root) to run the render against the example.

## Acceptance Criteria
1.  `npm install` works in root.
2.  `examples/canvas-basic` exists and can be served via `vite`.
3.  A script can run the renderer and produce `output.mp4`.
