# Context: Renderer (`packages/renderer`)

## A. Strategy Architecture
The Renderer uses a **Strategy Pattern** to support different rendering modes:
- **Canvas Strategy**: Uses `canvas.toDataURL()` via Playwright evaluation. Best for WebGL/Canvas2D.
- **DOM Strategy**: Uses `page.screenshot()` via Playwright. Best for CSS/HTML animations.
The strategy is selected via the `mode` option in `RendererOptions`.

## B. File Tree
packages/renderer/
├── package.json
├── scripts
│   └── render.ts
├── src
│   ├── index.ts
│   └── strategies
│       ├── CanvasStrategy.ts
│       ├── DomStrategy.ts
│       └── RenderStrategy.ts
└── tsconfig.json

## C. Configuration
```typescript
export interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  /**
   * The rendering mode to use.
   * - 'canvas': Captures frames by converting the first <canvas> element to a data URL.
   * - 'dom': Captures frames by taking a screenshot of the entire viewport.
   *
   * Defaults to 'canvas'.
   */
  mode?: 'canvas' | 'dom';
}
```

## D. FFmpeg Interface
The renderer pipes image data to FFmpeg (spawned process) with the following flags:
- Input: `-f image2pipe`, `-framerate {fps}`, `-i -`
- Codec: `-c:v libx264`
- Pixel Format: `-pix_fmt yuv420p`
- Flags: `-movflags +faststart`
