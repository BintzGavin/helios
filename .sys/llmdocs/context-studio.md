# Studio Domain Context

## Section A: Architecture
Helios Studio is a web-based integrated development environment for video composition. It consists of:
- **CLI/Dev Server**: Express server providing hot-module replacement, asset discovery, and preview capabilities via an MCP server architecture.
- **Client Application**: A React-based web interface containing the video player stage, timeline, property controls, and asset management panels. It relies extensively on contexts to maintain player, compositional, and application state.

## Section B: File Tree
`packages/studio/`
├── `bin/` - CLI executable entry point.
├── `src/`
│   ├── `cli.ts` - CLI commands definition.
│   ├── `server/` - Express server and dynamic dev environment handling.
│   ├── `context/` - React Contexts managing global state (e.g. `StudioContext`, `ToastContext`).
│   ├── `hooks/` - Custom React Hooks (e.g., audio waveforms).
│   └── `components/` - Application UI views.
│       ├── `Timeline.tsx` - Timeline view with drag-and-drop integration.
│       ├── `AssetsPanel/` - Asset management user interface.
│       ├── `Stage/` - Composition video player stage.
│       └── `...` - Additional UI panels (Props, Mixer, Captions, Diagnostics).

## Section C: CLI Interface
- `npx helios studio`: Starts the development server, initiating the MCP server and web UI to interactively view and edit compositions. It parses `helios.config.json` and supports various command options for port binding and path overrides.

## Section D: UI Components
- **Timeline (`Timeline.tsx`)**: Displays timeline with playhead tracking, markers, captions, and supports dragging dropping assets (from `AssetsPanel`) directly to specific timecode points on the timeline.
- **Stage (`Stage.tsx`)**: Integrates the `HeliosPlayer` Web Component.
- **Assets Panel**: Interfaces with backend server to list and drag-and-drop media items.
- **Props Editor**: Interrogates the active `HeliosSchema` to auto-generate a form setting properties for the current composition.
- **Compositions Panel**: Lists dynamically discovered components.
- **Audio Mixer Panel**: Configures runtime audio levels and settings.

## Section E: Integration
- Consumes `HeliosController` and the `<helios-player>` Web Component from `packages/player` to construct the interactive `Stage`.
- Exposes composition props and states leveraging schemas exported from `packages/core`.
