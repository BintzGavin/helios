# RENDERER Context

## A. Strategy: Dual-Path Architecture
The Renderer uses a **Strategy Pattern** to handle different content types, optimizing for performance and accuracy.

1.  **Canvas Strategy** (`mode: 'canvas'`)
    *   **Target**: WebGL, Three.js, PixiJS, P5.js, Canvas 2D.
    *   **Mechanism**: Injects scripts to capture frames from `<canvas>` elements.
    *   **Capture**: Uses `VideoEncoder` (WebCodecs) for hardware-accelerated encoding in the browser.
    *   **Fallback**: Uses `canvas.toDataURL()` or `createImageBitmap()` if WebCodecs is unavailable.
    *   **Time Driver**: `CdpTimeDriver` (Chrome DevTools Protocol) for precise, deterministic time control.

2.  **DOM Strategy** (`mode: 'dom'`)
    *   **Target**: HTML/CSS animations, GSAP, Framer Motion, standard DOM elements.
    *   **Mechanism**: Takes full-page screenshots via Playwright.
    *   **Capture**: `page.screenshot()` (PNG/JPEG).
    *   **Time Driver**: `SeekTimeDriver` (overrides `requestAnimationFrame`, `Date.now`, `performance.now`) to ensure deterministic rendering.

## B. File Tree
```
packages/renderer/
├── src/
│   ├── index.ts              # Entry point
│   ├── Renderer.ts           # Main class (facade)
│   ├── Orchestrator.ts       # Distributed rendering & orchestration
│   ├── types.ts              # Interfaces (RendererOptions, AudioTrackConfig)
│   ├── concat.ts             # Video concatenation utility
│   ├── strategies/
│   │   ├── CanvasStrategy.ts # WebCodecs/Canvas capture logic
│   │   └── DomStrategy.ts    # Playwright screenshot logic
│   ├── drivers/
│   │   ├── CdpTimeDriver.ts  # Virtual time via CDP
│   │   └── SeekTimeDriver.ts # Virtual time via polyfills
│   └── utils/
│       ├── FFmpegBuilder.ts  # FFmpeg argument generator
│       ├── FFmpegInspector.ts # Hardware acceleration detection
│       ├── dom-scanner.ts    # Audio/Video element discovery
│       ├── dom-scripts.ts    # Shared DOM injection scripts
│       └── blob-extractor.ts # Blob URL extraction
```

## C. Configuration
The `Renderer` is configured via `RendererOptions`:

```typescript
interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  mode?: 'canvas' | 'dom';
  videoCodec?: 'libx264' | 'libvpx-vp9' | 'copy';
  audioFilePath?: string;
  audioTracks?: AudioTrackConfig[];
  subtitles?: string; // Path to SRT file
  inputProps?: Record<string, any>;
  concurrency?: number; // For distributed rendering
  frameCount?: number; // Exact frame count override
  startFrame?: number; // Start frame for partial renders
  canvasSelector?: string; // CSS selector for canvas
  targetSelector?: string; // CSS selector for DOM screenshot target
  intermediateVideoCodec?: string; // 'vp8', 'vp9', 'av1', 'h264'
  intermediateImageFormat?: 'png' | 'jpeg';
  stabilityTimeout?: number; // Wait timeout for assets
  randomSeed?: number; // Deterministic PRNG seed
  mixInputAudio?: boolean; // Preserve implicit audio from input
  hwAccel?: string; // Hardware acceleration method ('cuda', 'vaapi', 'auto')
}
```

## D. FFmpeg Interface
The Renderer pipes raw frames (or encoded chunks) to FFmpeg's `stdin`.

*   **Canvas Mode**:
    *   Input: `h264` (Annex B) or `ivf` (VP8/VP9/AV1) stream via pipe.
    *   Flags: `-f h264 -i pipe:0` (or similar).
*   **DOM Mode**:
    *   Input: Image sequence via pipe.
    *   Flags: `-f image2pipe -vcodec png -i pipe:0`.
*   **Hardware Acceleration**:
    *   Configured via `hwAccel` option.
    *   Validated against available methods via `ffmpeg -hwaccels`.
    *   Injected via `-hwaccel [method]` flag.
*   **Output**:
    *   Controlled by `FFmpegBuilder`.
    *   Supports `libx264` (MP4), `libvpx-vp9` (WebM), `prores`, etc.
    *   Audio is mixed using `amix` filter or `-filter_complex`.

## E. Orchestration
The `RenderOrchestrator` manages distributed rendering jobs.

*   **Planning**: `RenderOrchestrator.plan(url, output, options)` generates a `RenderPlan` containing chunks, file paths, and execution options.
*   **Execution**: `RenderOrchestrator.render(url, output, options)` executes the plan (or generates one if not provided), rendering chunks in parallel and concatenating/mixing them.
*   **Pipeline**:
    1.  **Render Chunks**: Splits the job into `N` concurrent workers. Each worker renders a segment to a temporary `.mov` file with PCM audio (`pcm_s16le`).
    2.  **Concatenate**: Merges chunks into a single intermediate PCM master file using FFmpeg `concat` demuxer.
    3.  **Mix/Transcode**: Transcodes the master file to the final output format (e.g., MP4/AAC) and mixes any explicit audio tracks.
