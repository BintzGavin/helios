# Studio Context

## A. Architecture

The Helios Studio (`packages/studio`) is a browser-based IDE for developing and rendering video compositions. It follows a "Studio as a Tool" architecture, where the Studio server runs locally and serves the user's project files.

- **Frontend**: A Single Page Application (SPA) built with React and Vite. It communicates with the backend via REST API and JSON-RPC over WebSockets (MCP).
- **Backend**: A Node.js server (integrated into Vite dev server via `studioApiPlugin`) that handles file system operations, project discovery, and rendering orchestration.
- **Project Structure**: The Studio expects a project root containing `composition.html` files or directories.
- **Rendering**: The Studio integrates with `@helios-project/renderer` to execute render jobs. It supports both local rendering and generating job specs for distributed rendering.

## B. File Tree

```
packages/studio/
├── bin/
│   └── helios-studio.js    # CLI entry point
├── src/
│   ├── cli/                # CLI integration logic
│   ├── components/         # UI Components (RendersPanel, Timeline, etc.)
│   ├── context/            # React Context (StudioContext)
│   ├── server/             # Backend logic
│   │   ├── discovery.ts    # Project & Asset discovery
│   │   ├── render-manager.ts # Render job management & Orchestration
│   │   └── plugin.ts       # Vite plugin API routes
│   ├── types.ts            # Shared types
│   ├── App.tsx             # Main UI entry
│   └── main.tsx
├── index.html
├── package.json
└── vite.config.ts
```

## C. CLI Interface

The Studio is launched via the `helios` CLI (from `@helios-project/cli`).

- `helios studio [dir]`: Opens the Studio UI for the specified directory (defaults to CWD).
- `helios build`: Builds a production-ready player harness.
- `helios preview`: Serves the production build locally.

## D. UI Components

- **Sidebar**: Navigation tabs (Project, Assets, Renders, Settings).
- **Stage**: The main preview area hosting the `<helios-player>` component.
- **Timeline**: A multi-track timeline for scrubbing, playback control, and visualizing audio/markers.
- **Props Editor**: A schema-aware editor for modifying composition inputs (`inputProps`).
- **Renders Panel**: Manages render jobs (Local & Distributed Export).

## E. Integration

- **Core**: Consumes `Helios` class for state and schema.
- **Player**: Embeds `<helios-player>` Web Component for preview.
- **Renderer**: Uses `RenderOrchestrator` for planning and executing renders.
- **CLI**: The Studio backend exposes endpoints that the CLI can leverage (e.g., for `helios render` with HMR support, though currently CLI uses Renderer directly).

## F. Recent Changes (v0.107.2)
- **Renders Panel Verification**: Implemented comprehensive unit tests for `RendersPanel` to ensure stability of the rendering UI.
- **Portable Job Specs**: The "Export Job Spec" feature now generates relative paths for input, output, and chunks, enabling portability across different environments (e.g. local vs cloud).
