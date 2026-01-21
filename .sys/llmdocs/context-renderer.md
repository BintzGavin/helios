# Context: Renderer (Pipeline)

## A. Strategy
The Renderer architecture implements a "Dual-Path" strategy using the Strategy Pattern:
- **Canvas Mode**: Captures frames by converting the first `<canvas>` element to a data URL (using `toDataURL`). Best for canvas-based animations.
- **DOM Mode**: Captures frames by taking a screenshot of the entire viewport (using `page.screenshot`). Best for CSS/DOM-based animations.

## B. File Tree
```
packages/renderer/src/
├── strategies/
│   ├── CanvasStrategy.ts
│   ├── DomStrategy.ts
│   └── RenderStrategy.ts
└── index.ts
```

## C. Configuration
```typescript
interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  /**
   * The rendering mode to use.
   * - 'canvas': Defaults to 'canvas'.
   * - 'dom': Use for CSS/DOM animations.
   */
  mode?: 'canvas' | 'dom';
}
```

## D. FFmpeg Interface
The renderer spawns an FFmpeg process with the following flags:
- **Input**: `'-f', 'image2pipe', '-framerate', <fps>, '-i', '-'` (piped from buffer)
- **Output**:
  - `-c:v libx264`
  - `-pix_fmt yuv420p`
  - `-movflags +faststart`
  - `-y` (overwrite)
