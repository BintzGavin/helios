# Client-Side Export API Example

This example demonstrates how to programmatically use the Helios `ClientSideExporter` and `BridgeController` APIs to export video directly in the browser, bypassing the default `<helios-player>` UI.

## Overview

In some scenarios, you may want to build a completely custom "Studio" or "Editor" interface (like Canva or Figma) and only use Helios for the rendering engine. This example shows how to:

1.  Embed a Helios composition in an `<iframe>`.
2.  Establish a communication bridge using `BridgeController`.
3.  Trigger a client-side WebCodecs export using `ClientSideExporter`.

## Architecture

-   **`composition.html`**: A standard Helios composition. It uses `connectToParent(helios)` to expose its state and methods to the parent window via `postMessage`.
-   **`index.html` / `src/app.ts`**: The host application. It loads the composition and manages the export process.

## Key Components

### 1. BridgeController

The `BridgeController` wraps the `postMessage` communication protocol with the iframe. It provides a typed API to control playback, seek, and retrieve state.

```typescript
import { BridgeController } from '@helios-project/player/controllers';

// Initialize when HELIOS_READY is received
const controller = new BridgeController(iframe.contentWindow, initialState);
```

### 2. ClientSideExporter

The `ClientSideExporter` orchestrates the frame-by-frame rendering and video encoding process using the browser's `WebCodecs` API.

```typescript
import { ClientSideExporter } from '@helios-project/player/features/exporter';

const exporter = new ClientSideExporter(controller, iframe);

await exporter.export({
  format: 'mp4',
  mode: 'canvas', // Captures the canvas context directly
  canvasSelector: '#canvas', // Selector inside the iframe
  onProgress: (p) => console.log(p) // 0.0 to 1.0
});
```

## Running the Example

1.  Build the examples:
    ```bash
    npm run build:examples
    ```
2.  Serve the output:
    ```bash
    npx vite preview --outDir output/example-build
    ```
3.  Navigate to `/examples/client-export-api/index.html`.
