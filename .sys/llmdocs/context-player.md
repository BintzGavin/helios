# PLAYER Context

## Identity
- **Role**: Frontend / Player Agent
- **Domain**: `packages/player`
- **Responsibility**: `<helios-player>` Web Component, UI controls, iframe bridge.

## Component Structure
The `<helios-player>` component utilizes Shadow DOM for isolation.
- **Root**: Host element (block display, relative positioning).
- **Status Overlay**: Handles "Connecting...", "Loading...", and Error states (with Retry).
- **Iframe**: Sandboxed execution environment for the user's content (`sandbox="allow-scripts allow-same-origin"`).
- **Controls Overlay**:
  - Play/Pause / Restart Button
  - Export / Cancel Button
  - Speed Selector (0.25x - 2x)
  - Scrubber (Input Range)
  - Time Display (Current / Total)
  - Fullscreen Toggle

## Events
The component does not currently dispatch custom events to the DOM.
It communicates internally via:
- `window.postMessage` (Bridge Protocol)
- `KeyboardEvent` (Shortcuts)

## Attributes
The component observes the following attributes:

| Attribute | Type | Description |
|---|---|---|
| `src` | string | URL of the composition to load in the iframe. |
| `width` | number | Width aspect ratio component. |
| `height` | number | Height aspect ratio component. |
| `autoplay` | boolean | If present, starts playback automatically upon connection. |
| `loop` | boolean | If present, restarts playback when the timeline ends. |
| `controls` | boolean | If present, shows the UI controls overlay. |
| `export-mode` | string | `auto` (default), `canvas`, or `dom`. Controls the capture strategy. |
| `canvas-selector`| string | CSS selector for the canvas element (default: `canvas`). Used in `canvas` mode. |

## Keyboard Shortcuts
| Key | Action |
|---|---|
| Space / K | Toggle Play/Pause |
| F | Toggle Fullscreen |
| Right Arrow / L | Seek Forward 10 frames |
| Left Arrow / J | Seek Backward 10 frames |

## Architecture
- **Controllers**: Abstraction layer (`DirectController` vs `BridgeController`) to unify local and cross-origin interaction.
- **Bridge**: Uses `postMessage` for communication. The child page uses `connectToParent(helios)` helper to establish connection.
- **ClientSideExporter**: Modular export logic supporting WebCodecs (VideoEncoder, AudioEncoder) and DOM Snapshotting. Supports AAC audio mixing from `<audio>` elements.
- **UI Locking**: Prevents race conditions by disabling playback controls and keyboard shortcuts during client-side export.
- **DOM Capture**: Robust implementation using `XMLSerializer`, SVG `<foreignObject>`, and asset inlining (stylesheets, images, backgrounds, CSS `url()` assets, and `<canvas>` snapshots) for high-fidelity HTML exports.
