# Context: Renderer

## A. Strategy
The Renderer employs a **Dual-Path Architecture**:
1.  **Canvas Path (MVP)**: Uses `page.evaluate()` to access `canvas.toDataURL()` and pipe Base64 data to FFmpeg.
2.  **DOM Path (Planned)**: Will use Playwright to screenshot the DOM or use `VideoEncoder` approaches.

The renderer runs in a Node.js environment, launching a Headless Chromium instance via Playwright. It synchronizes the browser's `document.timeline` with the frame-by-frame export loop.

## B. File Tree
```
packages/renderer/src/
└── index.ts  # Main Renderer class and FFmpeg integration
```

## C. Configuration
```typescript
interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
}
```

## D. FFmpeg Interface
The renderer pipes raw image data to FFmpeg with the following configuration:
-   **Input Format**: `image2pipe` (piped via stdin)
-   **Video Codec**: `libx264`
-   **Pixel Format**: `yuv420p` (for compatibility)
-   **Flags**: `-movflags +faststart` (web optimization)
-   **Frame Rate**: Matches `RendererOptions.fps`
