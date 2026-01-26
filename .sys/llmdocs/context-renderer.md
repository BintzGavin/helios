# Context: Renderer

## A. Strategy
The Renderer employs a "Dual-Path" architecture:
1. **Canvas Mode**: For high-performance rendering of `<canvas>` based animations. Uses `CdpTimeDriver` to control time via Chrome DevTools Protocol and WebCodecs for efficient frame capture. Intermediate bitrate is configurable (defaulting to 25 Mbps floor).
2. **DOM Mode**: For rendering standard DOM/CSS animations. Uses `SeekTimeDriver` to manipulate `document.timeline.currentTime` and `page.screenshot` for capture.

## B. File Tree
packages/renderer/
├── scripts/
│   ├── render.ts
│   ├── verify-bitrate.ts
│   └── verify-error-handling.ts
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
│   ├── verify-codecs.ts
│   ├── verify-concat.ts
│   └── verify-range-render.ts
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
