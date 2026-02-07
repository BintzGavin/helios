---
name: client-export-api
description: How to use the Client-Side Export API in Helios Player to generate video files directly in the browser. Use when you need to offer video downloads without a server-side rendering pipeline.
---

# Client-Side Export API

Helios Player includes a built-in `VideoEncoder` implementation that allows users to export compositions as MP4 or WebM files directly in the browser.

## Quick Start

### 1. Enable Export in Player

Add the `export-mode` and relevant configuration attributes to your player.

```html
<helios-player
  src="./composition.html"
  export-mode="auto"
  export-format="mp4"
  export-caption-mode="burn-in"
  export-filename="my-video"
></helios-player>
```

### 2. Trigger Programmatically

You can trigger exports from your application logic instead of using the built-in UI.

```typescript
const player = document.querySelector('helios-player');

document.getElementById('download-btn').addEventListener('click', async () => {
  try {
    await player.export({
      filename: 'custom-export',
      format: 'mp4',
      onProgress: (p) => {
        console.log(`Exporting: ${(p * 100).toFixed(0)}%`);
      }
    });
    console.log("Export complete!");
  } catch (err) {
    console.error("Export failed:", err);
  }
});
```

## Configuration

| Attribute | Option Property | Description |
|-----------|----------------|-------------|
| `export-mode` | `mode` | Strategy: `auto` (try Canvas, fallback DOM), `canvas` (fast), `dom` (accurate). |
| `export-format` | `format` | `mp4`, `webm`, `png` (snapshot), `jpeg` (snapshot). |
| `export-width` | `width` | Output video width (defaults to player width). |
| `export-height` | `height` | Output video height. |
| `export-caption-mode`| `includeCaptions` | `burn-in` (render text) or `file` (download SRT). |
| `export-bitrate` | `bitrate` | Target bitrate in bits/sec (default ~5Mbps). |

## Key Patterns

### Custom Resolution Export
Export a high-resolution version (e.g., 4K) even if the preview is small.

```typescript
await player.export({
  width: 3840,
  height: 2160,
  bitrate: 20_000_000, // 20 Mbps
  filename: '4k-render'
});
```

### Snapshot Generation
Generate a thumbnail image of the current frame.

```typescript
await player.export({
  format: 'png',
  filename: 'thumbnail'
});
```

### Soft Subtitles
Download the video clean, but provide a sidecar `.srt` file.

```html
<helios-player
  export-caption-mode="file"
  ...
></helios-player>
```
*Note: Programmatic usage allows overriding this behavior via `includeCaptions: boolean`.*

## Requirements & Limitations

1.  **Browser Support:** Requires [WebCodecs API](https://caniuse.com/webcodecs) (Chrome 94+, Safari 15.4+, Firefox 130+).
2.  **CORS:** All assets (images, video, audio) must be loaded with CORS headers (`Access-Control-Allow-Origin: *`) to be captured by the encoder.
3.  **Audio:** `<audio>` elements must be cross-origin accessible.
4.  **Performance:** Export speed depends on client hardware (GPU encoding).

## Common Issues

### "Export Failed: SecurityError"
**Cause:** Tainted canvas. An image or video was drawn to the canvas without CORS approval.
**Fix:** Ensure all assets are served with correct CORS headers and `crossOrigin="anonymous"` attributes.

### "Export Aborted"
**Cause:** The user cancelled the operation or `abortSignal` was triggered.
