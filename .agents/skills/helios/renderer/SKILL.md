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
  frameCount?: number;     // Exact total frames (overrides durationInSeconds)
  startFrame?: number;     // Frame to start rendering from (default: 0)
  mode?: 'dom' | 'canvas'; // Rendering strategy (default: 'canvas')
  inputProps?: Record<string, any>; // Inject props into window.__HELIOS_PROPS__

  // Audio Configuration
  audioFilePath?: string;        // Path to single audio file
  audioTracks?: (string | AudioTrackConfig)[]; // List of audio tracks
  audioCodec?: string;           // e.g., 'aac', 'libvorbis'
  audioBitrate?: string;         // e.g., '128k', '192k'

  // Video Encoding
  videoCodec?: string;           // e.g., 'libx264' (default, prioritized), 'libvpx'
  pixelFormat?: string;          // e.g., 'yuv420p' (default)
  crf?: number;                  // Constant Rate Factor (quality control)
  preset?: string;               // Encoding preset (e.g., 'fast')
  videoBitrate?: string;         // e.g., '5M', '1000k'
  subtitles?: boolean;           // Burn subtitles into video (requires libx264)

  // Intermediate Capture (Canvas Mode)
  intermediateVideoCodec?: string; // 'vp8' (default), 'vp9', 'av1'

  // Intermediate Capture (DOM Mode)
  intermediateImageFormat?: 'png' | 'jpeg'; // Default: 'png'
  intermediateImageQuality?: number;        // 0-100 (only for jpeg)

  // System
  ffmpegPath?: string;           // Custom FFmpeg binary path
  browserConfig?: {              // Playwright Launch Options
    headless?: boolean;
    executablePath?: string;
    args?: string[];
  };
}

interface AudioTrackConfig {
  path: string;
  volume?: number; // 0.0 to 1.0
  offset?: number; // Start time in composition (seconds)
  seek?: number;   // Start time in source file (seconds)
  playbackRate?: number; // Speed multiplier (default: 1.0)
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
Check the rendering environment (Playwright, WebCodecs support, FFmpeg).

```typescript
// Returns a comprehensive diagnostic report
const diagnostics = await renderer.diagnose();

/*
{
  browser: {
    waapi: boolean,
    webCodecs: boolean,
    offscreenCanvas: boolean,
    userAgent: string
  },
  ffmpeg: {
    version: string,
    encoders: string[],
    filters: string[]
  }
}
*/
```

## Rendering Modes

### Canvas Mode (`mode: 'canvas'`)
- **Best for:** WebGL, Three.js, Pixi.js, 2D Canvas.
- **Mechanism:** Uses `CdpTimeDriver` to control time and `CanvasStrategy` to capture the canvas context directly.
- **Performance:** High. Fast capture via CDP.
- **Sync:** Uses `TreeWalker` to recursively discover and sync media in Shadow DOMs.

### DOM Mode (`mode: 'dom'`)
- **Best for:** CSS Animations, HTML/DOM elements, complex video/audio compositions.
- **Mechanism:** Uses `SeekTimeDriver` (seek & screenshot) to ensure DOM layouts settle.
- **Performance:** Slower than Canvas mode due to full-page screenshots.
- **Implicit Audio:** Automatically discovers `<audio>` and `<video>` tags in the DOM and includes their audio in the render.
- **Media Synchronization:** Supports precise control over nested media elements using attributes:
  - `data-helios-offset="2.5"`: Delay playback start by 2.5 seconds.
  - `data-helios-seek="10"`: Start playing from 10s into the source file.
  - `muted`: Respects the HTML `muted` attribute.
- **Recursive Sync:** Traverses Shadow DOMs (open and closed) to find and synchronize animations and media elements.
- **Stability:** Waits for `seeked` events on all media elements (Multi-Frame Seek) to ensure frames are perfectly aligned before capturing.

## Utilities

### Distributed Rendering
Split a render job into multiple chunks to run concurrently (e.g., on multiple cores).

```typescript
import { RenderOrchestrator, DistributedRenderOptions } from '@helios-project/renderer';

const options: DistributedRenderOptions = {
  // ...standard Renderer options...
  concurrency: 4 // Number of parallel workers (default: CPU cores - 1)
};

await RenderOrchestrator.render(
  'http://localhost:3000/composition.html',
  'output.mp4',
  options,
  { onProgress: (p) => console.log(`Total Progress: ${p}`) }
);
```

### Concatenate Videos
Combine multiple video files into one.

```typescript
import { concatenateVideos } from '@helios-project/renderer';

await concatenateVideos(['part1.mp4', 'part2.mp4'], 'full-video.mp4');
```

## Common Patterns

### Caption Burning
Burn subtitles (e.g. from the player) into the video output. Requires `videoCodec: 'libx264'`.

```typescript
const renderer = new Renderer({
  // ...
  videoCodec: 'libx264',
  subtitles: true
});
```

### Range Rendering
Render only a specific section of the composition (e.g., for distributed rendering).

```typescript
const renderer = new Renderer({
  // ...
  startFrame: 0,
  durationInSeconds: 5 // Render only first 5 seconds
});
// To render the next 5 seconds:
// startFrame: 150, durationInSeconds: 5
```

### Fast Draft Renders (DOM Mode)
Use JPEG instead of PNG for faster intermediate screenshots during DOM rendering.

```typescript
const renderer = new Renderer({
  mode: 'dom',
  intermediateImageFormat: 'jpeg',
  intermediateImageQuality: 80
});
```

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

## Source Files

- Main class: `packages/renderer/src/index.ts`
- Strategies: `packages/renderer/src/strategies/`
- Types: `packages/renderer/src/types.ts`
