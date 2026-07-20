# Helios Studio Context

## Section A: Architecture
Helios Studio is the browser-based development environment for video composition. It consists of:
- **CLI (`packages/cli`)**: Provides the `npx helios studio` command which starts the dev server.
- **Server (`src/server`)**: A Vite-based dev server that serves the Studio UI, discovers user compositions/assets via `HELIOS_PROJECT_ROOT`, and handles rendering/MCP requests.
- **UI (`src/components`)**: React-based frontend providing a visual interface for timeline, properties, and asset management.

## Section B: File Tree
```
packages/studio/
├── bin/
├── src/
│   ├── components/       # React UI components (Timeline, Stage, Panels)
│   ├── context/          # React Contexts (StudioContext for global state)
│   ├── hooks/            # Custom React hooks
│   ├── server/           # Vite plugin, API endpoints, rendering integrations
│   └── utils/            # Helper functions
├── vite.config.ts
└── package.json
```

## Section C: CLI Interface
The Studio is launched via the CLI package using: `npx helios studio`. The CLI injects `HELIOS_PROJECT_ROOT` pointing to the user's CWD to allow Studio to discover their compositions and assets dynamically.

## Section D: UI Components
- **Stage**: The main preview area integrating `<helios-player>`.
- **Timeline**: Visual track-based editor for sequencing assets.
- **PropsEditor**: JSON-based property editor for composition variables.
- **AssetsPanel**: Drag-and-drop asset management interface.
- **PlaybackControls**: Centralized playback state control.

## Section E: Integration
- **Core**: Consumes the `Helios` class for composition management.
- **Player**: Integrates the `<helios-player>` Web Component into the Stage.
- **Renderer**: Uses `@helios-project/renderer` via `/api/render` to execute real video exports based on the timeline.
