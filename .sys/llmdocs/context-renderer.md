# Renderer Agent Context

## A. Strategy
The Renderer operates on a "Dual-Path" architecture to support different use cases. The pipeline strictly enforces `strategy.prepare` (resource discovery/loading) before `timeDriver.prepare` (time freezing) to prevent deadlocks in CDP mode:
1. **DOM Strategy (`DomStrategy`)**: Used for HTML/CSS-heavy compositions. It uses Playwright to capture screenshots of the page at each frame.
   - **Drivers**: Uses `SeekTimeDriver` to manipulate `document.timeline` and sync media/CSS animations (supports Shadow DOM, enforces deterministic Jan 1 2024 epoch, handles GSAP timeline sync, supports media looping).
   - **Discovery**: Uses `dom-scanner` to recursively discover media elements (including Shadow DOM) and implements recursive preloading for `<img>` tags, `<video>` posters, SVG images, and CSS background/mask images. Supports automatic audio looping for `<audio loop>` elements via FFmpeg concat.
   - **Output**: Best for sharp text and vector graphics.
2. **Canvas Strategy (`CanvasStrategy`)**: Used for WebGL/Canvas-heavy compositions (e.g., Three.js, PixiJS). It captures the `<canvas>` context directly.
   - **Drivers**: Uses `CdpTimeDriver` (Chrome DevTools Protocol) for precise virtual time control (supports Shadow DOM media sync, enforces deterministic Jan 2024 epoch, ensures sync-before-render order, waits for budget expiration, enforces stability timeout via `Runtime.terminateExecution`, supports media looping).
   - **Optimization**: Prioritizes H.264 (AVC) intermediate codec for hardware acceleration, falling back to VP8. Exposes `diagnose()` API to verify supported WebCodecs.
   - **Output**: Best for high-performance 2D/3D graphics.

Both strategies pipe frame data directly to an FFmpeg process via stdin ("Zero Disk I/O"), ensuring high performance and low latency. Audio tracks from Blob URLs are extracted to memory and also piped to FFmpeg via additional pipes, avoiding temporary files.

The **Render Orchestrator** manages local distributed rendering by splitting the job into concurrent chunks and combining them, utilizing multi-core systems efficiently.

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
│   │   ├── dom-scanner.ts      # Asset discovery
│   │   └── blob-extractor.ts   # Blob URL extraction
│   ├── index.ts                # Main Entry point
│   ├── Renderer.ts             # Renderer class
│   ├── Orchestrator.ts         # Distributed rendering orchestrator
│   ├── concat.ts               # Video concatenation utility
│   └── types.ts                # Configuration interfaces
├── scripts/                    # Self-contained verification scripts (integration tests)
│   ├── verify-cancellation.ts  # Render cancellation test
│   ├── verify-trace.ts         # Playwright trace generation test
│   ├── verify-ffmpeg-path.ts   # FFmpeg binary path verification
│   ├── verify-blob-audio.ts    # Blob audio extraction test
│   └── ...                     # Other script-based tests
└── tests/
    ├── run-all.ts              # Test runner (executes comprehensive suite)
    ├── verify-browser-config.ts # Browser launch config test
    ├── verify-distributed.ts   # Distributed rendering verification
    ├── verify-waapi-sync.ts    # CSS animation sync test
    ├── verify-seek-driver-determinism.ts # SeekDriver determinism test
    ├── verify-cdp-media-sync-timing.ts # CdpDriver media sync timing test
    ├── verify-shadow-dom-animations.ts # Shadow DOM animation sync test
    ├── verify-shadow-dom-audio.ts # Shadow DOM audio test
    ├── verify-shadow-dom-sync.ts  # Shadow DOM sync test (DOM Mode)
    ├── verify-cdp-shadow-dom-sync.ts # Shadow DOM media sync test (Canvas Mode)
    ├── verify-shadow-dom-images.ts # Shadow DOM image discovery test
    ├── verify-enhanced-dom-preload.ts # Enhanced DOM preloading test
    ├── verify-dom-audio-fades.ts # DOM audio fades test
    ├── verify-frame-count.ts   # Precision frame count test
    ├── verify-cdp-hang.ts      # CDP initialization order/deadlock test
    ├── verify-cdp-driver.ts    # CdpDriver budget test
    ├── verify-cdp-driver-timeout.ts # CdpDriver stability timeout test
    ├── verify-diagnose.ts      # Codec diagnostics test
    ├── verify-transparency.ts  # Transparency support test
    ├── verify-canvas-strategy.ts # Canvas WebCodecs strategy test
    ├── verify-video-loop.ts    # Video looping logic verification
    └── ...                     # Other verification scripts
```

## C. Configuration
The `RendererOptions` interface controls the render pipeline:
- `width`, `height`: Output resolution.
- `fps`: Target frame rate.
- `durationInSeconds`: Total length of the video (fallback if `frameCount` is not set).
- `frameCount`: Exact number of frames to render (overrides `durationInSeconds`).
- `startFrame`: Frame index to start rendering from (for partial renders).
- `mode`: `'dom'` or `'canvas'`.
- `canvasSelector`: CSS selector to target the canvas element in `'canvas'` mode (default `'canvas'`).
- `browserConfig`: Object to customize Playwright browser launch (`headless`, `args`, `executablePath`).
- `videoCodec`: `'libx264'` (default), `'copy'`, or others.
- `audioCodec`: `'aac'` (default), `'libvorbis'`, etc.
- `audioFilePath`: Path to external audio file to mix in.
- `audioTracks`: List of audio tracks (files or `AudioTrackConfig` objects with `path`, `buffer`, `loop`, `volume`, `offset`).
- `intermediateImageFormat`: `'png'` (default) or `'jpeg'` for DOM mode capture.
- `intermediateImageQuality`: JPEG quality (0-100) if format is jpeg.
- `stabilityTimeout`: Timeout for frame stability (default 30000ms).
- `inputProps`: Object injected into the page as `window.__HELIOS_PROPS__`.

The `DistributedRenderOptions` interface (extends `RendererOptions`) adds:
- `concurrency`: Number of concurrent workers for distributed rendering.

## D. FFmpeg Interface
The renderer spawns an FFmpeg process with the following key flags:
- `-f image2pipe`: Reads frames from stdin.
- `pipe:N`: Additional inputs for audio buffers (mapped to file descriptors).
- `-c:v`: Video codec (e.g., `libx264`).
- `-pix_fmt`: Pixel format (e.g., `yuv420p`).
- `-vf`: Video filters (scaling, padding, subtitles).
- `-c:a`: Audio codec (if audio is present).
- `-t`: Duration.
- Output path (last argument).
