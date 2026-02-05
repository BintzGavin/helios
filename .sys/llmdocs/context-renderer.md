# Renderer Domain Context

## A. Strategy: Dual-Path Architecture

The Renderer employs a "Dual-Path" architecture to handle different rendering needs:

1.  **Canvas Strategy (`mode: 'canvas'`)**:
    -   **Target**: High-performance WebGL/Canvas animations (Three.js, PixiJS).
    -   **Mechanism**: Captures frames directly from the HTML `<canvas>` element (found via `canvasSelector`).
    -   **Optimization**: Prioritizes hardware-accelerated `WebCodecs` (checked via `navigator.mediaCapabilities`) and prefers H.264 over VP9 when hardware support is equivalent. Falls back to software WebCodecs or `toDataURL()` (PNG/JPEG) if necessary.
    -   **Audio**: Explicitly extracts audio from `<audio>`/`<video>` elements via `DomScanner`.

2.  **DOM Strategy (`mode: 'dom'`)**:
    -   **Target**: CSS animations, HTML/DOM-based motion graphics.
    -   **Mechanism**: Captures the viewport or a specific element (via `targetSelector`) using Playwright's `page.screenshot()` or `elementHandle.screenshot()`.
    -   **Optimization**: Supports `omittedBackground` for transparency.
    -   **Audio**: Scans for and includes implicit audio tracks.

Both strategies normalize the output into a stream of buffers (video frames) that are piped into FFmpeg.

## B. File Tree

```
packages/renderer/
├── src/
│   ├── strategies/
│   │   ├── CanvasStrategy.ts  # WebCodecs/Canvas capture
│   │   ├── DomStrategy.ts     # Screenshot capture
│   │   └── RenderStrategy.ts  # Interface
│   ├── utils/
│   │   ├── FFmpegBuilder.ts   # FFmpeg argument construction
│   │   ├── blob-extractor.ts  # Blob URL handling
│   │   ├── dom-finder.ts      # Shared deep element finding (Shadow DOM)
│   │   └── dom-scanner.ts     # Media element discovery
│   ├── index.ts               # Entry point
│   ├── Renderer.ts            # Main class
│   └── types.ts               # Configuration interfaces
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
  intermediateImageFormat?: 'png' | 'jpeg'; // For DOM/Fallback
  inputProps?: Record<string, any>; // Injected into window.__HELIOS_PROPS__
  mixInputAudio?: boolean; // Mix implicit audio from input
  subtitles?: string; // Path to SRT file to burn in
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
