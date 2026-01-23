# Context: Renderer (Visualization Pipeline)

## A. Strategy: Dual-Path Architecture
The Renderer supports two distinct capture strategies depending on the content type:
1. **Canvas Mode** (Default):
   - **Primary**: Uses `WebCodecs` (`VideoEncoder`) to encode frames directly in the browser into VP8/IVF chunks. This is high-performance and preserves color accuracy.
   - **Fallback**: Uses `canvas.toDataURL()` if WebCodecs is unavailable.
   - **Transfer**: Streams binary chunks (or Base64 images) to the Node.js process via Playwright `evaluate`.
2. **DOM Mode**:
   - Uses `page.screenshot()` (implied, or similar full-page capture) for CSS/HTML-heavy animations.

## B. File Tree
```
packages/renderer/src/
├── index.ts      # Renderer class entry point
├── types.ts      # Shared interfaces (RendererOptions)
└── strategies/
    ├── RenderStrategy.ts # Strategy Interface
    ├── CanvasStrategy.ts # WebCodecs/Canvas implementation
    └── DomStrategy.ts    # DOM capture implementation
```

## C. Configuration (RendererOptions)
```typescript
interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  mode?: 'canvas' | 'dom'; // Defaults to 'canvas'
}
```

## D. FFmpeg Interface
The strategy fully controls the FFmpeg argument construction (`getFFmpegArgs`).

**Input Args (WebCodecs/IVF)**:
```
-f ivf -i -
```

**Input Args (Image Pipe/Fallback)**:
```
-f image2pipe -framerate [FPS] -i -
```

**Output Args (Standard)**:
```
-c:v libx264
-pix_fmt yuv420p
-movflags +faststart
[OUTPUT_PATH]
```
