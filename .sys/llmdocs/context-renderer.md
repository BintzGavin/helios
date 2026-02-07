# Renderer Domain Context

## A. Strategy: Dual-Path Architecture

The Renderer employs a "Dual-Path" architecture to handle different rendering needs:

1.  **Canvas Strategy (`mode: 'canvas'`)**:
    -   **Target**: High-performance WebGL/Canvas animations (Three.js, PixiJS).
    -   **Mechanism**: Captures frames directly from the HTML `<canvas>` element (found via `canvasSelector`).
    -   **Optimization**: Prioritizes hardware-accelerated `WebCodecs` (checked via `navigator.mediaCapabilities`) and prefers H.264 over VP9 when hardware support is equivalent. Falls back to software WebCodecs or `toDataURL()` (PNG/JPEG) if necessary. Preloads fonts, images, and backgrounds (shared logic with DOM strategy).
    -   **Audio**: Explicitly extracts audio from `<audio>`/`<video>` elements via `DomScanner`.

2.  **DOM Strategy (`mode: 'dom'`)**:
    -   **Target**: CSS animations, HTML/DOM-based motion graphics.
    -   **Mechanism**: Captures the viewport or a specific element (via `targetSelector`) using Playwright's `page.screenshot()` or `elementHandle.screenshot()`.
    -   **Optimization**: Supports `omittedBackground` for transparency. Preloads fonts, images, and CSS background images (including those in Shadow DOM) to prevent rendering artifacts.
    -   **Audio**: Scans for and includes implicit audio tracks.

Both strategies rely on **Time Drivers** (`CdpTimeDriver` or `SeekTimeDriver`) to enforce frame-perfect synchronization and deterministic behavior. This includes:
-   **Virtual Time**: Overriding `Date.now()`, `performance.now()`, and `requestAnimationFrame`.
-   **Seeded Randomness**: Injecting a deterministic Mulberry32 PRNG to replace `Math.random()`, configurable via `randomSeed`.
-   **DOM Traversal**: Using consolidated scripts in `dom-scripts.ts` to recursively find media, images, and Shadow DOM scopes.

Both strategies normalize the output into a stream of buffers (video frames) that are piped into FFmpeg.

**Orchestrator**: Manages distributed rendering by splitting the job into concurrent chunks (workers) and concatenating the results. It utilizes the **Strategy Pattern** via the `RenderExecutor` interface (defaulting to `LocalExecutor`) to decouple the orchestration logic from the concrete rendering implementation, enabling pluggable execution contexts. It also implements robust cancellation (aborting all workers if one fails) and aggregates progress from all workers into a smooth, monotonic global progress value.

## B. File Tree

```
packages/renderer/
├── src/
│   ├── drivers/
│   │   ├── CdpTimeDriver.ts   # Deterministic virtual time (CDP)
│   │   └── SeekTimeDriver.ts  # Deterministic Seek-based time
│   ├── executors/
│   │   ├── LocalExecutor.ts   # Default local rendering wrapper
│   │   └── RenderExecutor.ts  # Interface for execution strategies
│   ├── strategies/
│   │   ├── CanvasStrategy.ts  # WebCodecs/Canvas capture
│   │   ├── DomStrategy.ts     # Screenshot capture
│   │   └── RenderStrategy.ts  # Interface
│   ├── utils/
│   │   ├── FFmpegBuilder.ts   # FFmpeg argument construction
│   │   ├── blob-extractor.ts  # Blob URL handling
│   │   ├── dom-finder.ts      # Shared deep element finding (Shadow DOM)
│   │   ├── dom-preload.ts     # Shared asset preloading logic
│   │   ├── dom-scanner.ts     # Media element discovery
│   │   ├── dom-scripts.ts     # Shared browser-side scripts (media, scopes, images)
│   │   └── random-seed.ts     # Deterministic PRNG injection
│   ├── Orchestrator.ts        # Distributed rendering coordination
│   ├── index.ts               # Entry point
│   ├── Renderer.ts            # Main class
│   └── types.ts               # Configuration interfaces
├── scripts/                   # Additional verification scripts
└── tests/                     # Verification scripts
```

## C. Configuration

The `RendererOptions` interface controls the pipeline:

```typescript
interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  mode?: 'canvas' | 'dom';
  canvasSelector?: string; // CSS selector for target canvas ('canvas' mode)
  targetSelector?: string; // CSS selector for target element ('dom' mode)
  audioFilePath?: string;
  audioTracks?: (string | AudioTrackConfig)[];
  videoCodec?: 'libx264' | 'libvpx' | 'libvpx-vp9' | 'copy';
  videoBitrate?: string;
  audioCodec?: string;
  pixelFormat?: string; // e.g. 'yuv420p', 'yuva420p'
  intermediateVideoCodec?: string; // For Canvas WebCodecs (e.g. 'avc1', 'vp9')
  keyFrameInterval?: number; // GOP size for WebCodecs
  intermediateImageFormat?: 'png' | 'jpeg'; // For DOM/Fallback
  stabilityTimeout?: number; // Timeout for asset loading (default: 30000ms)
  inputProps?: Record<string, any>; // Injected into window.__HELIOS_PROPS__
  mixInputAudio?: boolean; // Mix implicit audio from input
  subtitles?: string; // Path to SRT file to burn in
  randomSeed?: number; // Seed for deterministic PRNG (default: 0x12345678)
}
```

## D. FFmpeg Interface

The Renderer spawns an FFmpeg process and communicates via stdio:

-   **Input**:
    -   Video frames piped to `stdin` (`-f image2pipe` or `-f ivf` or `-f h264`).
    -   Audio tracks mapped as external inputs (`-i audio.mp3`).
-   **Filters**:
    -   `amix`: Mixes multiple audio tracks.
    -   `atempo`: Adjusts audio playback rate.
    -   `subtitles`: Burns subtitles if requested.
-   **Output**:
    -   Writes final video file to disk.
    -   Defaults to `libx264` (H.264) + `aac` (Audio) in an MP4 container.

## E. Diagnostics

The `renderer.diagnose()` method returns a comprehensive report on the environment:

-   **Canvas**: Detailed WebCodecs support matrix (Hardware/Software, Alpha).
-   **DOM**: Viewport dimensions, Device Pixel Ratio (DPR), and WebGL support.
-   **FFmpeg**: Installed version and supported encoders/filters.
