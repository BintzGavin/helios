# Renderer Context

## A. Strategy: Dual-Path Architecture
The Renderer employs a "Dual-Path" architecture to handle different rendering needs:

1.  **Canvas Strategy (`mode: 'canvas'`)**:
    *   **Best For**: High-performance, pixel-perfect rendering of `<canvas>` elements (WebGL, Three.js, PixiJS).
    *   **Mechanism**: Uses `WebCodecs` (H.264/VP8/VP9/AV1) to capture frames directly from the browser context.
    *   **Flow**: Browser -> `VideoEncoder` -> `EncodedVideoChunk` -> Node.js (via `page.exposeFunction`) -> FFmpeg (stdin).
    *   **Pros**: Fast, hardware-accelerated, supports transparency.
    *   **Cons**: Requires WebCodecs support.

2.  **DOM Strategy (`mode: 'dom'`)**:
    *   **Best For**: Complex HTML/CSS animations, GSAP, SVG.
    *   **Mechanism**: Uses Playwright's `page.screenshot` (PNG/JPEG) to capture the entire viewport.
    *   **Flow**: Browser -> `page.screenshot` -> Buffer -> Node.js -> FFmpeg (stdin).
    *   **Pros**: Capture anything visible (HTML, CSS).
    *   **Cons**: Slower (screenshot overhead), larger temporary data.

## B. File Tree
```
packages/renderer/src/
├── drivers/
│   ├── CdpTimeDriver.ts       # Chrome DevTools Protocol time control
│   ├── SeekTimeDriver.ts      # WAAPI/requestAnimationFrame time control
│   └── TimeDriver.ts          # Interface
├── strategies/
│   ├── CanvasStrategy.ts      # WebCodecs capture implementation
│   ├── DomStrategy.ts         # Screenshot capture implementation
│   └── RenderStrategy.ts      # Abstract base class
├── utils/
│   ├── FFmpegBuilder.ts       # FFmpeg argument generation
│   ├── FFmpegInspector.ts     # FFmpeg capability detection
│   ├── blob-extractor.ts      # Blob URL extraction utility
│   └── dom-scanner.ts         # Media element discovery
├── Orchestrator.ts            # Distributed rendering manager
├── Renderer.ts                # Main entry point class
├── concat.ts                  # Video concatenation utility
├── index.ts                   # Public exports
└── types.ts                   # Configuration interfaces
```

## C. Configuration: RendererOptions
The `RendererOptions` interface controls the rendering process:

```typescript
interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  duration?: number;             // Duration in seconds (optional if startFrame/frameCount used)
  startFrame?: number;           // Start frame index (default: 0)
  frameCount?: number;           // Total frames to render (overrides duration)
  mode: 'canvas' | 'dom';
  quality?: number;              // 0-100 (for JPEG/WebP)
  videoBitrate?: number;         // Target bitrate in bits/sec
  videoCodec?: 'libx264' | 'libvpx' | 'libvpx-vp9' | 'libaom-av1' | 'copy';
  audioCodec?: string;           // e.g., 'libmp3lame', 'aac'
  audioBitrate?: string;         // e.g., '128k'
  pixelFormat?: string;          // e.g., 'yuv420p', 'yuva420p'
  crf?: number;                  // Constant Rate Factor
  preset?: string;               // e.g., 'fast', 'slow'
  audioFilePath?: string;        // Path to audio file
  audioTracks?: AudioTrackConfig[]; // Multiple audio tracks
  inputProps?: Record<string, any>; // Injected into window.__HELIOS_PROPS__
  canvasSelector?: string;       // Selector for target canvas (mode: 'canvas')
  browserConfig?: BrowserConfig; // Custom Playwright launch args
  subtitles?: string;            // Path to SRT file for burning
  intermediateImageFormat?: 'png' | 'jpeg'; // (mode: 'dom')
  intermediateImageQuality?: number;        // (mode: 'dom')
  intermediateVideoCodec?: string;          // (mode: 'canvas') e.g., 'avc1.4d002a'
}
```

## D. FFmpeg Interface
The renderer communicates with FFmpeg via standard input (`stdin`) pipes.

*   **Video Input**: Piped as raw bytestream (Annex B H.264 or IVF) or image sequence (PNG/JPEG) via `pipe:3`.
*   **Audio Input**: Piped as raw PCM or compressed chunks via `pipe:4`, `pipe:5`, etc.
*   **Standard Flags**:
    *   `-y` (Overwrite output)
    *   `-f image2pipe` (for DOM) or `-f h264`/`-f ivf` (for Canvas)
    *   `-r <fps>` (Frame rate)
    *   `-i pipe:N` (Input streams)
    *   `-map` (Stream mapping)
    *   `-c:v <codec>` (Video encoder)
    *   `-pix_fmt <format>` (Pixel format)
