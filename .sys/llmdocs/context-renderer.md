# Context: Renderer

## A. Strategy
The Renderer employs a "Dual-Path" architecture:
1. **Canvas Mode**: For high-performance rendering of `<canvas>` based animations. Uses `CdpTimeDriver` to control time via Chrome DevTools Protocol and WebCodecs for efficient frame capture. Intermediate bitrate and codec (VP8/VP9/AV1) are configurable. Supports transparent video generation by preserving alpha channel when `pixelFormat` indicates transparency (e.g. `yuva420p`).
2. **DOM Mode**: For rendering standard DOM/CSS animations. Uses `SeekTimeDriver` to manipulate `document.timeline.currentTime` and `page.screenshot` for capture. Automatically preloads fonts, images (`<img>`), CSS background images, and media elements (`<video>`, `<audio>`) to prevent artifacts. To ensure deterministic JS animations, `SeekTimeDriver` injects a polyfill that overrides `performance.now()`, `Date.now()`, and `requestAnimationFrame()` with a controlled virtual time.

Exposes a programmatic `diagnose()` method to verify environment requirements (e.g., WebCodecs support, WAAPI) and return a detailed capability report before rendering.

## B. File Tree
packages/renderer/
├── scripts/
│   ├── render-dom.ts
│   ├── render.ts
│   ├── verify-bitrate.ts
│   ├── verify-diagnostics.ts
│   ├── verify-dom-preload.ts
│   ├── verify-error-handling.ts
│   └── verify-transparency.ts
├── src/
│   ├── drivers/
│   │   ├── CdpTimeDriver.ts
│   │   ├── SeekTimeDriver.ts
│   │   └── TimeDriver.ts
│   ├── strategies/
│   │   ├── CanvasStrategy.ts
│   │   ├── DomStrategy.ts
│   │   └── RenderStrategy.ts
│   ├── concat.ts
│   ├── index.ts
│   └── types.ts
├── tests/
│   ├── test-canvas-strategy.ts
│   ├── verify-codecs.ts
│   ├── verify-concat.ts
│   ├── verify-diagnose.ts
│   ├── verify-range-render.ts
│   └── verify-seek-driver-determinism.ts
└── package.json

## C. Configuration
```typescript
interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  mode?: 'canvas' | 'dom';
  startFrame?: number;
  audioFilePath?: string;
  videoCodec?: string;
  pixelFormat?: string;
  crf?: number;
  preset?: string;
  videoBitrate?: string;
  intermediateVideoCodec?: string;
  inputProps?: Record<string, any>;
  ffmpegPath?: string;
}

interface RenderJobOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
  tracePath?: string;
}
```

## D. FFmpeg Interface
The renderer pipes raw frames to FFmpeg via `stdin`.
Default flags: `-c:v libx264 -pix_fmt yuv420p -crf 23 -preset medium`.
Arguments are configurable via `RendererOptions`.
Includes a `concatenateVideos` utility for stitching multiple video files.
