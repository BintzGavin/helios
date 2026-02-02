# RENDERER Context

## A. Strategy: Dual-Path Architecture
The Renderer uses a "Dual-Path" architecture to optimize for both quality and compatibility:
1.  **Canvas Strategy**: The preferred path. Uses the browser's `Canvas` API and `WebCodecs` (VideoEncoder) to capture frames directly from the `<canvas>` element. This is fast and supports high-quality, pixel-perfect rendering.
2.  **DOM Strategy**: The fallback path. Uses Playwright's `page.screenshot` or `cdpSession` to capture the entire DOM. This supports complex CSS layouts and elements that cannot be rendered to a canvas (e.g. HTML text overlays), but is slower.

## B. File Tree
```
packages/renderer/
├── src/
│   ├── index.ts          # Entry point
│   ├── Renderer.ts       # Main Renderer class
│   ├── concat.ts         # Video concatenation utility (Zero Disk I/O)
│   ├── types.ts          # RendererOptions and other types
│   ├── strategies/
│   │   ├── RenderStrategy.ts # Interface
│   │   ├── CanvasStrategy.ts # WebCodecs implementation
│   │   └── DomStrategy.ts    # Screenshot implementation
│   └── drivers/
│       ├── TimeDriver.ts     # Interface
│       ├── SeekTimeDriver.ts # Deterministic seeking (requestAnimationFrame)
│       └── CdpTimeDriver.ts  # Chrome DevTools Protocol time control
├── tests/                # Verification scripts
└── package.json
```

## C. Configuration
The `RendererOptions` interface controls the render process:
- `width`, `height`: Output resolution.
- `fps`: Frames per second.
- `durationInSeconds`: Total duration.
- `mode`: 'canvas' or 'dom'.
- `audioFilePath`: Optional path to audio file to mix.
- `videoCodec`: 'libx264', 'libvpx', 'libvpx-vp9', 'libaom-av1', or 'copy'.
- `pixelFormat`: 'yuv420p', 'yuva420p', etc.
- `quality`: JPEG quality for DOM screenshots.

## D. FFmpeg Interface
The renderer pipes frames to FFmpeg via `stdin` (Zero Disk I/O).
Key flags:
- `-f image2pipe`: Reads images from pipe.
- `-i -`: Input from stdin.
- `-c:v <codec>`: Video encoder.
- `-pix_fmt <fmt>`: Pixel format.
- `concatenateVideos`: Uses `-f concat -safe 0 -protocol_whitelist file,pipe -i -` to read file list from stdin.
