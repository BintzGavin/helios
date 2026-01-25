---
title: "Renderer API"
description: "API Reference for @helios-project/renderer"
---

# Renderer API

The `@helios-project/renderer` package allows you to render compositions to video files.

## Renderer Class

### Constructor

```typescript
import { Renderer } from '@helios-project/renderer';

const renderer = new Renderer();
```

### `render(options)`

Renders a composition to a video file.

**`RenderJobOptions`**:
- **`input`** (string): Path or URL to the composition file.
- **`output`** (string): Path to the output file (e.g., `output.mp4`).
- **`width`** (number): Output video width.
- **`height`** (number): Output video height.
- **`fps`** (number): Frame rate.
- **`duration`** (number): Duration in seconds.
- **`audioFilePath`** (string, optional): Path to an audio file to mix in.
- **`startFrame`** (number, optional): Frame to start rendering from.
- **`tracePath`** (string, optional): Path to save Playwright trace (for debugging).
- **`onProgress`** (function): Callback for progress updates.

### Example

```typescript
const renderer = new Renderer();

await renderer.render({
  input: 'http://localhost:5173/composition.html',
  output: 'my-video.mp4',
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 5,
  onProgress: (progress) => {
    console.log(`Rendering: ${(progress * 100).toFixed(1)}%`);
  }
});
```

## Strategies

The renderer automatically chooses a strategy:
- **`CanvasStrategy`**: For Canvas-based compositions.
- **`DomStrategy`**: For DOM-based compositions (uses `SeekTimeDriver`).
