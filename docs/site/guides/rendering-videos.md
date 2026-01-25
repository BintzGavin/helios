---
title: "Rendering Videos"
description: "How to export your compositions to video files."
---

# Rendering Videos

The `@helios-project/renderer` package allows you to turn your web-based composition into a video file (MP4).

## How it Works

1.  **Headless Browser**: The renderer launches a headless Chrome instance.
2.  **Load Composition**: It loads your composition URL.
3.  **Frame-by-Frame**: It advances the time deterministically, frame by frame.
4.  **Capture**: It captures a screenshot (or canvas data) for each frame.
5.  **Encode**: It pipes the frames to FFmpeg to encode the video.

## Basic Usage

Create a Node.js script (e.g., `render.js`):

```javascript
import { Renderer } from '@helios-project/renderer';

(async () => {
  const renderer = new Renderer();

  console.log('Starting render...');

  await renderer.render({
    input: 'http://localhost:5173/composition.html', // Your local dev server
    output: 'output.mp4',
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 10
  });

  console.log('Render complete!');
})();
```

Run it with `node render.js`.

## Adding Audio

You can mix an audio file into the final video.

```javascript
await renderer.render({
  // ...
  audioFilePath: './soundtrack.mp3'
});
```

The audio will be trimmed or looped to match the video duration (depending on future config, currently standard mix).

## Partial Rendering

You can render just a part of the composition using `startFrame` and explicitly controlling duration.

```javascript
await renderer.render({
  // ...
  startFrame: 0,
  duration: 2 // Render only first 2 seconds
});
```
