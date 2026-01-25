# Context: Renderer (Visualization Pipeline)

## A. Strategy: Dual-Path Architecture
The Renderer supports two distinct capture strategies depending on the content type:
1. **Canvas Mode** (Default):
   - **Primary**: Uses `WebCodecs` (`VideoEncoder`) to encode frames directly in the browser into VP8/IVF chunks. This is high-performance and preserves color accuracy.
   - **Fallback**: Uses `canvas.toDataURL()` if WebCodecs is unavailable.
   - **Transfer**: Streams binary chunks (or Base64 images) to the Node.js process via Playwright `evaluate`.
2. **DOM Mode**:
   - Uses `page.screenshot()` for full-page capture of CSS/HTML animations.
   - **Preloading**: Explicitly waits for fonts (`document.fonts.ready`) and images to fully load before starting the capture loop to prevent artifacts.

## B. Time Control
The Renderer uses a `TimeDriver` architecture to control animation timing:
- **CdpTimeDriver** (Canvas Mode): Uses Chrome DevTools Protocol (`Emulation.setVirtualTimePolicy`) for deterministic, frame-perfect rendering independent of wall-clock time.
- **SeekTimeDriver** (DOM Mode): Uses `requestAnimationFrame` seeking because `CdpTimeDriver` is incompatible with `page.screenshot` capture.

## C. File Tree
```
packages/renderer/
├── scripts/              # Verification and utility scripts
│   ├── render.ts         # Canvas rendering verification
│   ├── render-dom.ts     # DOM rendering verification
│   ├── verify-cancellation.ts # Cancellation/Progress verification
│   └── verify-error-handling.ts # Strict error handling verification
└── src/
    ├── index.ts          # Renderer class entry point
    ├── types.ts          # Shared interfaces (RendererOptions, RenderJobOptions)
    ├── drivers/          # Time Control
    │   ├── TimeDriver.ts     # Interface
    │   ├── SeekTimeDriver.ts # RequestAnimationFrame implementation (Legacy/Preview)
    │   └── CdpTimeDriver.ts  # Chrome DevTools Protocol implementation (Production)
    └── strategies/
        ├── RenderStrategy.ts # Strategy Interface
        ├── CanvasStrategy.ts # WebCodecs/Canvas implementation
        └── DomStrategy.ts    # DOM capture implementation
```

## D. Configuration

```typescript
interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  mode?: 'canvas' | 'dom'; // Defaults to 'canvas'
  startFrame?: number; // Start rendering from this frame (distributed rendering)
  audioFilePath?: string; // Path to audio file to mix
}

interface RenderJobOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
  tracePath?: string; // Path to save Playwright trace zip
}
```

**Usage**:
```typescript
renderer.render(url, outputPath, {
  onProgress: (p) => console.log(`Progress: ${p}`),
  signal: abortController.signal,
  tracePath: 'output/trace.zip'
});
```

## E. FFmpeg Interface
The strategy fully controls the FFmpeg argument construction (`getFFmpegArgs`).

**Input Args (WebCodecs/IVF)**:
```
-f ivf -i -
```

**Input Args (Image Pipe)**:
```
-f image2pipe -framerate [FPS] -i -
```

**Output Args (Standard)**:
```
-c:v libx264
-pix_fmt yuv420p
-movflags +faststart
[OUTPUT_PATH]
```

**Audio Support**:
If `audioFilePath` is present, adds input `1` and maps it:
```
-i [AUDIO_PATH] ... -c:a aac -map 0:v -map 1:a -shortest
```
If `startFrame` is > 0, the audio input is pre-seeked using `-ss [TIME]`.

## F. Error Handling
- **Strict Propagation**: The Renderer listens for `pageerror` and `crash` events from the browser.
- **Fail Fast**: Any captured error (including async WebCodecs failures) immediately aborts the render loop and rejects the `render()` promise.
- **Process Cleanup**: The FFmpeg child process is explicitly killed if an error occurs to prevent hangs.
