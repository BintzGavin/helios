---
title: "Client-Side Export API"
description: "Programmatic video export in the browser."
---

# Client-Side Export API

This example demonstrates how to build a custom export workflow using the `ClientSideExporter` class, bypassing the default `<helios-player>` UI. This is ideal for building custom creative tools or "Studio-like" interfaces.

## Architecture

The workflow involves two parts:
1.  **The Composition**: Runs inside an `<iframe>` and exposes itself via `postMessage`.
2.  **The Host**: Controls the iframe via `BridgeController` and runs the `ClientSideExporter`.

## Implementation

### 1. Composition Setup

Your composition must be ready to accept external control. Standard Helios compositions are compatible by default, but you can explicitly ensure connection:

```javascript
// In composition.html / main.js
const helios = new Helios({ ... });
helios.bindToDocumentTimeline();

// The bridge will connect automatically when probed
```

### 2. Host Controller

The host application connects to the iframe using the `BridgeController`.

```typescript
import { BridgeController } from '@helios-project/player/controllers';

const iframe = document.querySelector('iframe');

// Listen for the ready signal from the composition
window.addEventListener('message', (event) => {
    if (event.data.type === 'HELIOS_READY') {
        const controller = new BridgeController(iframe.contentWindow, event.data.state);
        // Controller is now ready to play, seek, etc.
    }
});
```

### 3. Performing the Export

Use the `ClientSideExporter` to render the composition to a video file (MP4/WebM).

```typescript
import { ClientSideExporter } from '@helios-project/player/features/exporter';

const exporter = new ClientSideExporter(controller, iframe);

await exporter.export({
    format: 'mp4',          // 'mp4' or 'webm'
    mode: 'canvas',         // 'canvas' (WebGL) or 'dom' (HTML/CSS)
    canvasSelector: 'canvas', // Selector for the canvas element (if mode is 'canvas')
    includeCaptions: true,  // Burn-in captions?
    onProgress: (progress) => {
        console.log(`Export Progress: ${(progress * 100).toFixed(0)}%`);
    }
});
```

## Features

-   **WebCodecs**: Uses the browser's native hardware encoding (H.264/VP9).
-   **Audio Mixing**: Captures and mixes audio from the composition.
-   **Cancellation**: Pass an `AbortSignal` to cancel the export.
