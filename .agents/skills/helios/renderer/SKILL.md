---
name: helios-renderer
description: Renderer API for generating video/image output from Helios compositions. Use when you need to programmatically render a composition to a file using Node.js.
---

# Helios Renderer API

The `Renderer` class enables headless rendering of Helios compositions using Playwright and FFmpeg. It supports both DOM-based and Canvas-based rendering strategies.

## Quick Start

```typescript
import { Renderer } from '@helios-project/renderer';

const renderer = new Renderer({
  width: 1920,
  height: 1080,
  fps: 30,
  durationInSeconds: 10,
  mode: 'canvas', // or 'dom'
  inputProps: { title: "Render Job 1" }
});

await renderer.render(
  'http://localhost:3000/composition.html',
  './output.mp4',
  {
    onProgress: (progress) => console.log(`Rendering: ${(progress * 100).toFixed(1)}%`)
  }
);
```

## API Reference

### Constructor

```typescript
new Renderer(options: RendererOptions)

interface RendererOptions {
  width: number;           // Output width
  height: number;          // Output height
  fps: number;             // Frames per second
  durationInSeconds: number; // Duration of the clip
  startFrame?: number;     // Frame to start rendering from (default: 0)
  mode?: 'dom' | 'canvas'; // Rendering strategy (default: 'canvas')
  inputProps?: Record<string, any>; // Inject props into window.__HELIOS_PROPS__

  // Audio Configuration
  audioFilePath?: string;        // Path to single audio file
  audioTracks?: (string | AudioTrackConfig)[]; // List of audio tracks
  audioCodec?: string;           // e.g., 'aac', 'libvorbis'
  audioBitrate?: string;         // e.g., '128k', '192k'

  // Video Encoding
  videoCodec?: string;           // e.g., 'libx264' (default), 'libvpx'
  pixelFormat?: string;          // e.g., 'yuv420p' (default)
  crf?: number;                  // Constant Rate Factor (quality control)
  preset?: string;               // Encoding preset (e.g., 'fast')
  videoBitrate?: string;         // e.g., '5M', '1000k'
  intermediateVideoCodec?: string; // Capture codec ('vp8', 'vp9', 'av1')
  ffmpegPath?: string;           // Custom FFmpeg binary path
}

interface AudioTrackConfig {
  path: string;
  volume?: number; // 0.0 to 1.0
  offset?: number; // Start time in composition (seconds)
  seek?: number;   // Start time in source file (seconds)
}
```

### Methods

#### Render
Renders the composition at the given URL to a video file.

```typescript
async render(
  compositionUrl: string,
  outputPath: string,
  jobOptions?: RenderJobOptions
): Promise<void>

interface RenderJobOptions {
  onProgress?: (progress: number) => void; // Callback 0.0 to 1.0
  signal?: AbortSignal;                    // For cancellation
  tracePath?: string;                      // Path to save Playwright trace (for debugging)
}
```

#### Diagnose
Check the rendering environment (Playwright, WebCodecs support, etc.).

```typescript
// Returns a diagnostic report from the browser context
const diagnostics = await renderer.diagnose();
```

## Rendering Modes

### Canvas Mode (`mode: 'canvas'`)
- **Best for:** WebGL, Three.js, Pixi.js, 2D Canvas.
- **Mechanism:** Uses `CdpTimeDriver` to control time and `CanvasStrategy` to capture the canvas context directly.
- **Performance:** High. Fast capture via CDP.

### DOM Mode (`mode: 'dom'`)
- **Best for:** CSS Animations, HTML/DOM elements.
- **Mechanism:** Uses `SeekTimeDriver` (seek & screenshot) to ensure DOM layouts settle.
- **Performance:** Slower than Canvas mode due to full-page screenshots.
- **Implicit Audio:** Automatically discovers `<audio>` and `<video>` tags in the DOM and includes their audio in the render.

## Utilities

### Concatenate Videos
Combine multiple video files into one.

```typescript
import { concatenateVideos } from '@helios-project/renderer';

await concatenateVideos(['part1.mp4', 'part2.mp4'], 'full-video.mp4');
```

## Common Patterns

### Audio Mixing
Mix multiple audio tracks with offsets and volume control.

```typescript
const renderer = new Renderer({
  // ...
  audioTracks: [
    { path: 'music.mp3', volume: 0.5 },
    { path: 'voiceover.wav', volume: 1.0, offset: 2 } // Start voice at 2s
  ]
});
```

### Cancellable Render

```typescript
const controller = new AbortController();

// Start render
renderer.render(url, output, { signal: controller.signal })
  .catch(err => {
    if (err.message === 'Aborted') console.log('Render cancelled');
    else console.error(err);
  });

// Cancel later
setTimeout(() => controller.abort(), 2000);
```

### Debugging with Traces

If a render fails or looks wrong, enable Playwright tracing:

```typescript
await renderer.render(url, output, {
  tracePath: './trace.zip'
});
```
Then view `trace.zip` at [trace.playwright.dev](https://trace.playwright.dev/).

## Source Files

- Main class: `packages/renderer/src/index.ts`
- Strategies: `packages/renderer/src/strategies/`
- Types: `packages/renderer/src/types.ts`
