# Player Context

This file documents the public interface and structure of the `packages/player` domain.

## A. Component Structure

The `<helios-player>` Web Component encapsulates the playback environment and UI controls.

**Shadow DOM Layout:**
```html
<shadow-root>
  <style>...</style>

  <!-- Status Overlay (Loading/Error) -->
  <div class="status-overlay" part="overlay">
    <div class="status-text">...</div>
    <button class="retry-btn">Retry</button>
  </div>

  <!-- Sandboxed Iframe -->
  <iframe part="iframe" sandbox="allow-scripts allow-same-origin"></iframe>

  <!-- Controls Bar -->
  <div class="controls">
    <button class="play-pause-btn" part="play-pause-button">...</button>
    <button class="export-btn" part="export-button">...</button>
    <select class="speed-selector" part="speed-selector">...</select>
    <input type="range" class="scrubber" part="scrubber">
    <div class="time-display" part="time-display">...</div>
  </div>
</shadow-root>
```

## B. Attributes

- **`src`**: URL of the Helios composition to load in the iframe.
- **`export-mode`**: Controls client-side export behavior. Values: `auto` (default), `canvas`, `dom`.
- **`canvas-selector`**: CSS selector for the canvas to capture in `canvas` mode (default: `canvas`).

## C. Public API

The element exposes a `getController()` method:

```typescript
function getController(): HeliosController | null;
```

**HeliosController Interface:**
```typescript
interface HeliosController {
  play(): void;
  pause(): void;
  seek(frame: number): void;
  setPlaybackRate(rate: number): void;
  setInputProps(props: Record<string, any>): void;
  subscribe(callback: (state: any) => void): () => void;
  getState(): any;
  dispose(): void;
  captureFrame(frame: number, options?: CaptureOptions): Promise<VideoFrame | null>;
}
```

## D. Export Features

The player supports client-side video export (MP4/H.264) via `ClientSideExporter`.

- **Canvas Mode**: Captures the canvas element directly.
- **DOM Mode**: Serializes the DOM using `XMLSerializer` and renders via SVG `<foreignObject>` to an `ImageBitmap`.
- **Auto Mode**: Attempts to find a canvas; falls back to DOM capture if none found.

Supported in both Direct (same-origin) and Bridge (cross-origin/sandboxed) modes.
