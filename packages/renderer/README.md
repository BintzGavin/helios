# @helios-project/renderer

The high-performance Node.js rendering engine for Helios. This package orchestrates the rendering process, capturing frames from a browser environment (via Playwright) and piping them directly into FFmpeg to generate video output.

## Key Features

- **Dual-Path Architecture**:
  - **Canvas Mode**: Optimizes for WebGL/Canvas 2D. Uses `WebCodecs` (H.264/VP9/AV1) for high-performance intermediate capture, falling back to standard canvas capture if needed.
  - **DOM Mode**: Optimizes for HTML/CSS animations. Uses Playwright's screenshot capabilities to capture pixel-perfect renderings of the DOM.
- **Zero Disk I/O**: Frames are piped directly from the browser to the Node.js process and then to FFmpeg's `stdin`, completely bypassing the disk for maximum speed.
- **Smart Codec Selection**: automatically detects the best intermediate format (e.g., passing through H.264 streams directly or using raw video for screenshot mode).
- **Audio Mixing**: Supports multiple audio tracks with precise offset, volume control, and seeking.
- **Diagnostics**: Built-in tools to verify the rendering environment (FFmpeg version, browser capabilities).

## Installation

```bash
npm install @helios-project/renderer
```

## Usage

```typescript
import { Renderer } from '@helios-project/renderer';

async function main() {
  // Initialize the renderer with options
  const renderer = new Renderer({
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    mode: 'canvas', // or 'dom'
    videoCodec: 'libx264',
    // ... other options
  });

  // Render a composition
  await renderer.render(
    'http://localhost:3000/my-composition', // URL to the composition
    './output.mp4'                          // Output file path
  );
}

main();
```

## Configuration

The `Renderer` constructor accepts a `RendererOptions` object:

| Option | Type | Default | Description |
|Args|---|---|---|
| `width` | `number` | **Required** | Output width in pixels. |
| `height` | `number` | **Required** | Output height in pixels. |
| `fps` | `number` | **Required** | Frames per second. |
| `durationInSeconds` | `number` | **Required** | Total duration of the render. |
| `mode` | `'canvas' \| 'dom'` | `'canvas'` | Rendering strategy. Use 'canvas' for WebGL, 'dom' for HTML/CSS. |
| `videoCodec` | `string` | `'libx264'` | Output video codec (e.g., 'libx264', 'libvpx-vp9', 'copy'). |
| `audioFilePath` | `string` | `undefined` | Primary audio file path. |
| `audioTracks` | `AudioTrackConfig[]` | `[]` | List of audio tracks with volume/offset/seek control. |
| `inputProps` | `Record<string, any>` | `{}` | Props injected into the page as `window.__HELIOS_PROPS__`. |

*See `src/types.ts` for the full list of advanced options including bitrates, CRF, presets, and intermediate formats.*

## Architecture

### Render Strategies

The renderer uses the **Strategy Pattern** to handle different content types:
- `CanvasStrategy`: Injects scripts to capture `OffscreenCanvas` or `<canvas>` elements. Prioritizes `VideoEncoder` (WebCodecs) for hardware-accelerated encoding within the browser before transmission.
- `DomStrategy`: Uses Playwright's `page.screenshot()` to capture the entire viewport. Ideal for complex CSS animations that cannot be captured via canvas.

### Time Drivers

To ensure deterministic rendering, time is controlled via **Time Drivers**:
- `SeekTimeDriver`: Manually seeks the document timeline and media elements to exact timestamps for each frame, ensuring perfect synchronization regardless of rendering speed.
