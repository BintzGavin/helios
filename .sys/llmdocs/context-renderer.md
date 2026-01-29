# Context: @helios-project/renderer

## A. Strategy
The renderer implements a **Dual-Path Architecture** to handle different types of web content:
1. **Canvas Mode** (`CanvasStrategy`):
   - **Target**: WebGL, Three.js, PixiJS, Canvas 2D.
   - **Mechanism**: Injects scripts to capture frames using `WebCodecs` (VideoEncoder) for high performance, or `canvas.toDataURL()` as fallback.
   - **Time Driver**: `CdpTimeDriver` (Chrome DevTools Protocol) to virtually advance time.
2. **DOM Mode** (`DomStrategy`):
   - **Target**: CSS Animations, HTML layouts, GSAP (DOM).
   - **Mechanism**: Uses Playwright's `page.screenshot()` to capture pixel-perfect viewports.
   - **Time Driver**: `SeekTimeDriver` (WAAPI) to manually seek `document.timeline` and media elements.

## B. File Tree
```
packages/renderer/
├── src/
│   ├── index.ts                # Main entry point (Renderer class)
│   ├── types.ts                # Configuration interfaces
│   ├── concat.ts               # Video concatenation utility
│   ├── drivers/                # Time synchronization logic
│   │   ├── TimeDriver.ts       # Interface
│   │   ├── CdpTimeDriver.ts    # CDP-based driver (Canvas)
│   │   └── SeekTimeDriver.ts   # WAAPI-based driver (DOM)
│   ├── strategies/             # Capture logic
│   │   ├── RenderStrategy.ts   # Interface
│   │   ├── CanvasStrategy.ts   # WebCodecs/Canvas capture
│   │   └── DomStrategy.ts      # Screenshot capture
│   └── utils/
│       └── FFmpegInspector.ts  # Environment diagnostics
└── tests/                      # Verification scripts
```

## C. Configuration
The `RendererOptions` interface controls the pipeline:
```typescript
interface RendererOptions {
  // Dimensions & Timing
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;

  // Strategy
  mode?: 'canvas' | 'dom'; // Defaults to 'canvas'

  // Output Encoding
  videoCodec?: 'libx264' | 'libvpx-vp9' | 'copy' | string;
  videoBitrate?: string;
  crf?: number;
  preset?: string;
  pixelFormat?: string;

  // Audio
  audioFilePath?: string;
  audioTracks?: (string | AudioTrackConfig)[];
  audioCodec?: string;
  audioBitrate?: string;

  // Advanced
  startFrame?: number;
  inputProps?: Record<string, any>; // Injected as window.__HELIOS_PROPS__
  intermediateVideoCodec?: 'vp8' | 'vp9' | 'av1'; // For Canvas mode
  intermediateImageFormat?: 'png' | 'jpeg';       // For DOM mode
  subtitles?: string; // Path to SRT file
  ffmpegPath?: string;
}
```

## D. FFmpeg Interface
The renderer spawns FFmpeg as a child process and pipes image data to `stdin`.
**Typical Flags**:
- Input: `-f image2pipe` (DOM) or `-f ivf/h264` (Canvas WebCodecs)
- Framerate: `-framerate [fps]`
- Filters: `complex_filter` used for mixing audio tracks (`amix`) and burning subtitles (`subtitles`).
- Output: `-c:v [videoCodec]`, `-c:a [audioCodec]`, `-pix_fmt [pixelFormat]`.
