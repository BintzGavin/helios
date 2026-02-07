# Renderer Agent Context

## A. Strategy: Dual-Path Architecture
The Renderer uses a strategy pattern to support two distinct rendering modes:
1. **Canvas Mode (`CanvasStrategy`)**:
   - Designed for high-performance WebGL/Canvas rendering (Three.js, PixiJS).
   - Uses `CdpTimeDriver` (Chrome DevTools Protocol) to control time.
   - Captures frames directly from the canvas context or via WebCodecs.
   - Supports hardware acceleration (H.264, VP9).
2. **DOM Mode (`DomStrategy`)**:
   - Designed for CSS/HTML animations and complex DOM structures.
   - Uses `SeekTimeDriver` to manipulate time via `Date.now` and `requestAnimationFrame` overrides.
   - Captures frames by taking full-page screenshots.
   - Supports "Implicit Audio" discovery (scanning DOM for `<audio>` tags).

## B. File Tree
packages/renderer/src/
├── drivers/
│   ├── CdpTimeDriver.ts
│   ├── SeekTimeDriver.ts
│   └── TimeDriver.ts
├── executors/
├── strategies/
│   ├── CanvasStrategy.ts
│   ├── DomStrategy.ts
│   └── RenderStrategy.ts
├── utils/
│   ├── FFmpegBuilder.ts
│   ├── FFmpegInspector.ts
│   ├── blob-extractor.ts
│   ├── dom-finder.ts
│   ├── dom-preload.ts
│   ├── dom-scanner.ts
│   ├── dom-scripts.ts
│   └── random-seed.ts
├── Orchestrator.ts
├── Renderer.ts
├── concat.ts
├── index.ts
└── types.ts

## C. Configuration
The `RendererOptions` interface controls the rendering process:
- **Dimensions & Timing**: `width`, `height`, `fps`, `durationInSeconds`, `frameCount`, `startFrame`.
- **Mode**: `mode: 'canvas' | 'dom'` (default: 'canvas').
- **Selectors**: `canvasSelector` (Canvas mode), `targetSelector` (DOM mode).
- **Audio**: `audioFilePath`, `audioTracks` (list of paths/configs), `mixInputAudio`.
- **Video Encoding**: `videoCodec` (default: 'libx264'), `pixelFormat` (default: 'yuv420p'), `crf`, `preset`, `videoBitrate`, `subtitles` (SRT path), `hwAccel` (Hardware Acceleration).
- **Intermediate Capture**: `intermediateVideoCodec` (Canvas), `intermediateImageFormat` (DOM).
- **System**: `ffmpegPath`, `browserConfig` (Playwright options), `stabilityTimeout`.

## D. FFmpeg Interface
The Renderer spawns an FFmpeg process with flags constructed by `FFmpegBuilder`. Key flags include:
- **Input**: `-f image2pipe` (DOM) or raw stream (Canvas), `-framerate`, `-i -` (pipe from stdin).
- **Audio**: `-i <audioFile>`, `-filter_complex` (for mixing/fading/looping/atempo).
- **Encoding**: `-c:v <videoCodec>`, `-pix_fmt <pixelFormat>`, `-crf`, `-preset`, `-b:v <bitrate>`.
- **Hardware Acceleration**: `-hwaccel <method>` (if configured).
- **Output**: `-y` (overwrite), `<outputPath>`.
