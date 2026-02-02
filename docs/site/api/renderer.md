---
title: "Renderer API"
description: "API Reference for @helios-project/renderer"
---

# Renderer API

The `@helios-project/renderer` package allows you to render Helios compositions to video files using Puppeteer/Playwright and FFmpeg.

## Renderer Class

### Constructor

```typescript
import { Renderer, RendererOptions } from '@helios-project/renderer';

const options: RendererOptions = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInSeconds: 5,
  mode: 'canvas', // 'canvas' or 'dom'

  // Video Encoding
  videoCodec: 'libx264', // 'libx264', 'libvpx-vp9', 'libaom-av1', or 'copy'
  videoBitrate: '5000k',
  intermediateVideoCodec: 'libvpx-vp9', // For internal capture (or 'avc1' for H.264)
  pixelFormat: 'yuv420p',

  // Audio
  audioFilePath: './audio.mp3', // Supports local paths and blob: URLs
  audioCodec: 'aac', // 'aac', 'libvorbis', etc.
  audioBitrate: '192k',
  audioTracks: ['./voiceover.mp3', './music.mp3'], // For mixing multiple tracks

  // Captions
  subtitles: './captions.srt', // Path to SRT file for burn-in subtitles

  // Input Injection
  inputProps: { title: "Rendered Video" },

  // Rendering Range
  startFrame: 0,
  frameCount: 150, // Optional: Override duration to render exactly this many frames

  // Canvas Targeting
  canvasSelector: '#my-canvas', // Optional: Select a specific canvas element

  ffmpegPath: '/path/to/ffmpeg', // Optional

  // Browser Configuration
  browserConfig: {
      headless: true,
      args: ['--no-sandbox'] // Custom Playwright launch arguments
  }
};

const renderer = new Renderer(options);
```

### `render(url, output, jobOptions)`

Renders a composition from a URL to a video file. Supports automatic burning of subtitles if provided in options.

- **`url`** (string): The URL of the composition to render (e.g., `http://localhost:3000`).
- **`output`** (string): The output file path (e.g., `./output/video.mp4`).
- **`jobOptions`** (`RenderJobOptions`, optional):
    - **`onProgress`** `(progress: number) => void`: Callback for render progress (0.0 to 1.0).
    - **`signal`** `(AbortSignal)`: Signal to abort the rendering process.
    - **`tracePath`** `(string)`: Path to save a Playwright trace zip file for debugging.

```typescript
await renderer.render(
  'http://localhost:5173/composition.html',
  'output.mp4',
  {
    onProgress: (p) => console.log(`Progress: ${p * 100}%`),
    tracePath: './trace.zip'
  }
);
```

### Strategies

The renderer uses different strategies based on `mode`:

- **`canvas`**: Uses `CdpTimeDriver` (Chrome DevTools Protocol) and `CanvasStrategy`. Captures frames via WebCodecs or Screenshot. Best for Canvas/WebGL.
    - **H.264 Support**: By default, `CanvasStrategy` prioritizes H.264 (`avc1`) intermediate capture for performance.
    - **Stream Copy**: If `videoCodec: 'copy'` is used, the renderer performs a lossless stream copy from the WebCodecs output to the container, bypassing re-encoding.
- **`dom`**: Uses `SeekTimeDriver` and `DomStrategy`. Captures frames by taking screenshots of the DOM. Supports CSS animations, font loading, image preloading, and `startFrame`.

### Diagnostics

#### `Renderer.diagnose()`
Runs diagnostic checks on the page context to verify WebCodecs support (H.264, VP8, VP9, AV1), WAAPI availability, and other environment capabilities using a headless browser. Returns a detailed report including browser capabilities and FFmpeg configuration.

```typescript
const diagnostics = await renderer.diagnose();
console.log(diagnostics);
/*
{
  browser: {
    webCodecs: {
      h264: true,
      vp8: true,
      ...
    },
    waapi: true
  },
  ffmpeg: {
    version: "...",
    encoders: ["libx264", ...]
  }
}
*/
```

## Utilities

### `concatenateVideos(inputs, output, options)`
Concatenates multiple video files into one. Useful for distributed rendering.

```typescript
import { concatenateVideos } from '@helios-project/renderer';

await concatenateVideos(['part1.mp4', 'part2.mp4'], 'final.mp4');
```
