# Context: PLAYER

## Overview
The `packages/player` package provides the `<helios-player>` Web Component, which acts as a "Remote Control" for a Helios animation running inside an iframe. It supports both Direct Mode (same-origin) and Bridge Mode (cross-origin, sandboxed) via `postMessage`.

## Public API

### Web Component: `<helios-player>`

#### Attributes
- `src` (string): The URL of the composition to load in the iframe.

#### Methods
- `disconnectCallback()`: Cleans up listeners and controllers.

#### Shadow DOM Structure
- `.status-overlay`: Displays connection status ("Connecting...", "Failed").
- `iframe`: The sandbox for the composition.
- `.controls`: The UI bar (Play/Pause, Scrubber, Time Display, Export Button).

### Export Functionality
- **Client-Side Export**: Uses `ClientSideExporter` (WebCodecs + mp4-muxer) to generate MP4s in the browser.
- **Cancellation**: Users can cancel an ongoing export.
- **Modes**:
    - **Canvas**: Captures content from a `<canvas>` element.
    - **DOM**: Fallback using rudimentary DOM-to-Canvas rendering.

## Internal Architecture

### Controllers (`src/controllers.ts`)
- `HeliosController` (Interface): Common interface for controlling Helios.
- `DirectController`: Wraps a direct `Helios` instance (same-origin).
- `BridgeController`: Communicates via `postMessage` (cross-origin).

### Features (`src/features/exporter.ts`)
- `ClientSideExporter`: Handles the render loop, seeking, encoding, and muxing.
