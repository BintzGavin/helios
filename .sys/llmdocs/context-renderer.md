# Renderer Agent Context

## A. Strategy: Dual-Path Architecture
The Renderer employs a "Dual-Path" architecture to support both Canvas-based and DOM-based animations:

1. **Canvas Strategy (`CanvasStrategy.ts`)**:
   - Best for high-performance animations (WebGL, Three.js, PixiJS).
   - Captures frames by converting the `<canvas>` element to a blob/buffer.
   - Uses `VideoEncoder` (WebCodecs) for hardware-accelerated intermediate encoding (H.264/VP9/AV1) when available.
   - Falls back to `toDataURL()` if WebCodecs is unavailable or disabled.
   - Supports `webCodecsPreference` to control hardware acceleration usage.

2. **DOM Strategy (`DomStrategy.ts`)**:
   - Best for CSS animations, HTML content, and complex layouts.
   - Captures frames by taking a full viewport screenshot via Playwright (`page.screenshot`).
   - Supports transparent backgrounds (`omitBackground: true`).
   - Slower than Canvas strategy but pixel-perfect for DOM elements.

Both strategies implement the `RenderStrategy` interface and share common utilities for:
- Asset preloading (fonts, images, media).
- Time synchronization (TimeDrivers).
- Audio track discovery.

## B. File Tree

packages/renderer/
├── src/
│   ├── strategies/
│   │   ├── CanvasStrategy.ts       # Canvas capture implementation
│   │   ├── DomStrategy.ts          # DOM screenshot implementation
│   │   └── RenderStrategy.ts       # Strategy interface
│   ├── utils/
│   │   ├── FFmpegBuilder.ts        # FFmpeg command construction
│   │   ├── FFmpegInspector.ts      # FFmpeg capability detection
│   │   ├── blob-extractor.ts       # Blob URL handling
│   │   ├── dom-finder.ts           # Deep element selection
│   │   ├── dom-preload.ts          # Asset preloading scripts
│   │   ├── dom-scanner.ts          # Media element discovery
│   │   ├── dom-scripts.ts          # Shared browser scripts
│   │   └── random-seed.ts          # Deterministic PRNG
│   ├── drivers/                    # Time synchronization drivers
│   ├── executors/                  # Execution strategies (Local vs Distributed)
│   ├── Orchestrator.ts             # Distributed rendering orchestrator
│   ├── Renderer.ts                 # Main entry point
│   ├── concat.ts                   # Video concatenation utility
│   ├── index.ts                    # Public API export
│   └── types.ts                    # Shared interfaces
└── tests/                          # Verification scripts

## C. Configuration: RendererOptions

```typescript
export interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  mode?: 'canvas' | 'dom'; // Defaults to 'canvas'

  // Frame Control
  startFrame?: number;
  frameCount?: number;
  keyFrameInterval?: number;

  // Codecs & Quality
  videoCodec?: string; // e.g. 'libx264', 'libvpx', 'copy'
  audioCodec?: string;
  pixelFormat?: string; // e.g. 'yuv420p', 'yuva420p'
  crf?: number;
  preset?: string;
  videoBitrate?: string;
  audioBitrate?: string;

  // Intermediate Capture
  intermediateVideoCodec?: string; // 'vp8', 'vp9', 'av1'
  intermediateImageFormat?: 'png' | 'jpeg';
  intermediateImageQuality?: number;
  webCodecsPreference?: 'hardware' | 'software' | 'disabled';

  // Inputs
  audioFilePath?: string;
  audioTracks?: (string | AudioTrackConfig)[];
  subtitles?: string; // Path to SRT file
  inputProps?: Record<string, any>;
  mixInputAudio?: boolean;
  randomSeed?: number;

  // Environment
  browserConfig?: BrowserConfig;
  ffmpegPath?: string;
  stabilityTimeout?: number;
  hwAccel?: string; // FFmpeg hardware acceleration

  // Selectors
  canvasSelector?: string;
  targetSelector?: string;
}
```

## D. FFmpeg Interface

The Renderer constructs FFmpeg commands dynamically using `FFmpegBuilder`.

**Common Flags:**
- **Input**: `-f image2pipe` (DOM/Canvas fallback) or `-f h264`/`-f ivf` (WebCodecs).
- **Framerate**: `-framerate <fps>`.
- **Codecs**: `-c:v <videoCodec>` (default: libx264), `-c:a <audioCodec>`.
- **Filters**:
  - `atempo`: For audio playback rate adjustment.
  - `amix`: For mixing multiple audio tracks.
  - `subtitles`: For burning SRT captions.
  - `-vf "scale=..."`: For resizing (if needed).

**Hardware Acceleration:**
- Controlled via `hwAccel` option (e.g., `-hwaccel cuda`).
- Checked via `FFmpegInspector` to ensure availability.
