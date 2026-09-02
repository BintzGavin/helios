---
title: "Rendering Videos"
description: "Render complete videos, frame ranges, and distributed jobs."
---

# Rendering Videos

`@helios-project/renderer` loads a composition in Playwright, seeks it to exact frame times, captures each frame, and pipes the result to FFmpeg.

Use `mode: 'dom'` for HTML, CSS, WAAPI, and media elements. Use `mode: 'canvas'` for Canvas, WebGL, and browser-side WebCodecs output.

## Render a complete video

Create the renderer with an explicit resolution, frame rate, and duration, then pass the composition URL and output path to `render`:

```typescript
import { Renderer } from '@helios-project/renderer';

const renderer = new Renderer({
  width: 1920,
  height: 1080,
  fps: 30,
  durationInSeconds: 10,
  mode: 'dom',
  inputProps: { title: 'Launch' },
});

await renderer.render(
  'http://localhost:5173/composition.html',
  './output.mp4',
  {
    onProgress: progress => console.log(`${Math.round(progress * 100)}%`),
  },
);
```

Keep the composition deterministic: use Helios as its clock, seed unavoidable randomness, and finish loading fonts, media, data, and models before capture.

## Add audio

Provide one audio file or a list of tracks in the renderer options:

```typescript
const renderer = new Renderer({
  width: 1920,
  height: 1080,
  fps: 30,
  durationInSeconds: 10,
  audioTracks: [
    { path: './voiceover.wav' },
    { path: './music.mp3', volume: 0.35 },
  ],
});
```

DOM mode also discovers audio from `<audio>` and `<video>` elements. Use the renderer's audio pipeline instead of starting independent browser playback during capture.

## Render an exact frame range

Use both `startFrame` and `frameCount` when a worker renders only part of a composition:

```typescript
const renderer = new Renderer({
  width: 1920,
  height: 1080,
  fps: 30,
  durationInSeconds: 5,
  startFrame: 300,
  frameCount: 150,
});
```

`startFrame` controls the composition time seen by Helios, animations, and media elements. Do not render frame zero and compensate inside composition code; that can make media and animation clocks disagree.

Treat each range as half-open: a chunk with `startFrame: 300` and `frameCount: 150` owns frames 300 through 449.

## Render chunks locally

`RenderOrchestrator.render` plans frame ranges, renders them concurrently, concatenates the outputs, and performs the final explicit-audio mix:

```typescript
import { RenderOrchestrator } from '@helios-project/renderer';

await RenderOrchestrator.render(
  'http://localhost:5173/composition.html',
  './output.mp4',
  {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 60,
    mode: 'dom',
    concurrency: 4,
    audioFilePath: './soundtrack.wav',
  },
);
```

Here, `concurrency` is the number of render chunks executed together. It is not the number of pages used inside one renderer. Choose it from measurements on the actual composition and worker environment rather than a universal CPU or memory formula.

If one local chunk fails, `RenderOrchestrator.render` aborts its sibling executions. That process-local cancellation does not automatically cross machine or provider boundaries.

## Create a portable render plan

Use `RenderOrchestrator.plan` when another process or service will execute the chunks:

```typescript
import { RenderOrchestrator } from '@helios-project/renderer';

const plan = RenderOrchestrator.plan(
  'https://assets.example.com/composition.html',
  './output.mp4',
  {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 60,
    mode: 'dom',
    concurrency: 4,
  },
);

for (const chunk of plan.chunks) {
  // Send chunk.options, chunk.startFrame, chunk.frameCount, and
  // chunk.outputFile to the worker without recalculating the range.
}
```

The CLI can serialize the same plan and execute it through local or remote adapters:

```bash
helios render http://localhost:5173/composition.html \
  --output output.mp4 \
  --duration 60 \
  --mode dom \
  --concurrency 4 \
  --emit-job render-job.json

helios job run render-job.json --concurrency 4
```

For remote execution:

- Treat the generated `startFrame` and `frameCount` as authoritative.
- Give every chunk a stable output identity so retries are idempotent.
- Let the coordinator own retries, sibling cancellation, and incomplete output cleanup.
- Concatenate successful chunks in plan order and mix explicit audio once at the final output stage.
- Validate boundaries by comparing the distributed output with the same frame numbers from a single render.

## Timeouts and diagnostics

`stabilityTimeout` bounds asset and custom stability waits. In DOM mode it also bounds each screenshot capture so a compositor stall fails with frame context instead of leaving the render pending indefinitely.

Run `renderer.diagnose()` in the target worker image before a production render, especially when browser codecs, WebCodecs, FFmpeg encoders, or hardware acceleration differ from local development.
