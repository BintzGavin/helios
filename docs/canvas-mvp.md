# Canvas MVP Status

**Status:** Verified (2024-05-21)

The Canvas MVP path is functional. It currently uses a **Playwright Capture** approach, where the browser renders the canvas, and we extract frames via `canvas.toDataURL()`.

## How to Run

1.  **Install dependencies**:
    ```bash
    npm install
    npx playwright install
    ```

2.  **Verify Environment**:
    Run the diagnostics tool to ensure FFmpeg and GPU acceleration are available.
    ```bash
    npm run diagnose
    ```

3.  **Render Example**:
    ```bash
    npm run render:canvas-example
    ```
    This will generate `output/canvas-animation.mp4`.

## Architecture (Current)

1.  **Composition**: `examples/simple-canvas-animation/composition.html` defines the animation using `document.timeline.currentTime`.
2.  **Renderer**: `packages/renderer/src/index.ts` launches Playwright.
3.  **Capture**: For each frame, the renderer:
    - Sets `currentTime`.
    - Waits for `requestAnimationFrame`.
    - Calls `canvas.toDataURL('image/png')`.
    - Pipes the base64 data to FFmpeg's `stdin`.

## Limitations
- **Performance**: `toDataURL` is slow (CPU-bound image encoding).
- **Color Space**: Limited to sRGB 8-bit.
- **Accuracy**: Relies on `setTimeout` / `requestAnimationFrame` alignment in Playwright, which is generally good but not frame-perfect deterministic like `VideoEncoder` would be.

## Next Steps
- Implement **WebCodecs** path (Roadmap Item 3) to replace `toDataURL` for higher performance.
