# Renderer Agent Context

## A. Strategy
The Renderer operates on a "Dual-Path" architecture to support different use cases:
1. **DOM Strategy (`DomStrategy`)**: Used for HTML/CSS-heavy compositions. It uses Playwright to capture screenshots of the page at each frame.
   - **Drivers**: Uses `SeekTimeDriver` to manipulate `document.timeline` and sync media/CSS animations (supports Shadow DOM).
   - **Discovery**: Uses `dom-scanner` to recursively discover media elements (including Shadow DOM).
   - **Output**: Best for sharp text and vector graphics.
2. **Canvas Strategy (`CanvasStrategy`)**: Used for WebGL/Canvas-heavy compositions (e.g., Three.js, PixiJS). It captures the `<canvas>` context directly.
   - **Drivers**: Uses `CdpTimeDriver` (Chrome DevTools Protocol) for precise virtual time control.
   - **Output**: Best for high-performance 2D/3D graphics.

Both strategies pipe frame data directly to an FFmpeg process via stdin ("Zero Disk I/O"), ensuring high performance and low latency.

## B. File Tree
```
packages/renderer/
├── src/
│   ├── drivers/
│   │   ├── TimeDriver.ts       # Interface for time control
│   │   ├── CdpTimeDriver.ts    # CDP-based time driver
│   │   └── SeekTimeDriver.ts   # DOM-based time driver (WAAPI sync)
│   ├── strategies/
│   │   ├── RenderStrategy.ts   # Interface for strategies
│   │   ├── CanvasStrategy.ts   # WebGL/Canvas capture
│   │   └── DomStrategy.ts      # Screenshot capture
│   ├── utils/
│   │   ├── FFmpegBuilder.ts    # Argument generator
│   │   ├── FFmpegInspector.ts  # Environment diagnostics
│   │   └── dom-scanner.ts      # Asset discovery
│   ├── index.ts                # Main Renderer class
│   └── types.ts                # Configuration interfaces
└── tests/
    ├── run-all.ts              # Test runner
    ├── verify-waapi-sync.ts    # CSS animation sync test
    ├── verify-shadow-dom-animations.ts # Shadow DOM animation sync test
    ├── verify-shadow-dom-audio.ts # Shadow DOM audio test
    ├── verify-shadow-dom-sync.ts  # Shadow DOM sync test
    └── ...                     # Other verification scripts
```

## C. Configuration
The `RendererOptions` interface controls the render pipeline:
- `width`, `height`: Output resolution.
- `fps`: Target frame rate.
- `durationInSeconds`: Total length of the video.
- `mode`: `'dom'` or `'canvas'`.
- `browserConfig`: Object to customize Playwright browser launch (`headless`, `args`, `executablePath`).
- `videoCodec`: `'libx264'` (default), `'copy'`, or others.
- `audioCodec`: `'aac'` (default), `'libvorbis'`, etc.
- `audioFilePath`: Path to external audio file to mix in.
- `inputProps`: Object injected into the page as `window.__HELIOS_PROPS__`.

## D. FFmpeg Interface
The renderer spawns an FFmpeg process with the following key flags:
- `-f image2pipe`: Reads frames from stdin.
- `-c:v`: Video codec (e.g., `libx264`).
- `-pix_fmt`: Pixel format (e.g., `yuv420p`).
- `-vf`: Video filters (scaling, padding, subtitles).
- `-c:a`: Audio codec (if audio is present).
- `-t`: Duration.
- Output path (last argument).
