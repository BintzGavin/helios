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

  // Stability & Determinism
  randomSeed: 'my-seed', // Optional: Seed for deterministic randomness
  stabilityTimeout: 30000, // Optional: Timeout for stability waits and DOM capture (ms)

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

- **`canvas`**: Uses `SeekTimeDriver` and `CanvasStrategy`. Captures frames via WebCodecs or Screenshot. Best for Canvas/WebGL. On each frame, the renderer runs the page's queued `requestAnimationFrame` callbacks at that frame's time, so rAF-driven canvases are frame-exact. (`HELIOS_CANVAS_SEEK_CLOCK=0` selects the older `CdpTimeDriver`, which follows the wall clock for rAF-driven and Helios-bound pages.)
    - **H.264 Support**: By default, `CanvasStrategy` prioritizes H.264 (`avc1`) intermediate capture for performance.
    - **Hardware Acceleration**: Prioritizes hardware-accelerated codecs (checking `navigator.mediaCapabilities.encodingInfo` for `powerEfficient: true`) and prefers H.264 over VP9 when hardware support is equivalent.
    - **Stream Copy**: If `videoCodec: 'copy'` is used, the renderer performs a lossless stream copy from the WebCodecs output to the container, bypassing re-encoding.
- **`dom`**: Uses `SeekTimeDriver` and `DomStrategy`. Captures frames by taking screenshots of the DOM. Supports CSS animations, font loading, image preloading, visual playback rate synchronization, and `startFrame`.

### Frame hooks

A page doesn't have to import Helios. If it defines one of these functions, the renderer calls it once per frame, in both modes, before capturing that frame. The first one defined is used:

- `window.renderAt(t)`
- `window.__render(t)`
- `window.seek(t)`

- `t` is the frame's time in **seconds**.
- If the function returns a promise, the renderer waits for it, up to `stabilityTimeout`.
- If it throws or rejects, the render fails with the page's error, naming the function and the time.
- `window.helios`, CSS/WAAPI animations and a `window.__helios_gsap_timeline__` are still seeked as before, and the page's clock (`performance.now()`, `Date.now()`, rAF timestamps) reads the frame's time.
- Timers (`setTimeout`, `setInterval`) run on real time. Animate from `t`, not from timers.

The renderer starts as soon as the page defines one of these hooks or `window.helios`. A page that defines neither starts after a 3 s grace period, and a warning is logged.

### Probing a composition

#### `probeComposition(url, options?)`
Loads a page once and reports what drives it and, for Helios compositions, what they declare. `helios render` uses this to fill in `--duration`, `--fps` and the size when they're omitted.

```typescript
import { probeComposition } from '@helios-project/renderer';

const info = await probeComposition('file:///path/to/composition.html');
// { driver: 'helios', durationInSeconds: 10, fps: 30, width: 1920, height: 1080 }
// { driver: 'hook', hook: 'renderAt' }   (a page with window.renderAt(t))
// { driver: 'none' }                     (CSS / WAAPI / rAF only)
```

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
