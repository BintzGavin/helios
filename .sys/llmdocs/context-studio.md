# Studio Context

## A. Architecture

The Helios Studio (`packages/studio`) is a browser-based IDE for developing and rendering video compositions. It follows a "Studio as a Tool" architecture, where the Studio server runs locally and serves the user's project files.

- **Frontend**: A Single Page Application (SPA) built with React and Vite. It communicates with the backend via REST API and JSON-RPC over WebSockets (MCP).
- **Backend**: A Node.js server (integrated into Vite dev server via `studioApiPlugin`) that handles file system operations, project discovery, and rendering orchestration.
- **Agent Integration**: Exposes an MCP (Model Context Protocol) server with resources (`documentation`, `assets`, `components`) and tools (`install_component`, etc.) to enable AI agents to interact with the project.
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
│   │   ├── documentation.ts # Documentation discovery
│   │   ├── mcp.ts          # MCP Server implementation
│   │   ├── plugin.ts       # Vite plugin API routes
│   │   ├── render-manager.ts # Render job management & Orchestration
│   │   └── types.ts        # Shared server types
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
- `helios remove`: Removes a component from the project configuration and deletes associated files (interactive).

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

## F. Recent Changes (v0.108.2)
- **Completed: Enhance README Quickstart**: Updated `packages/studio/README.md` to recommend `npx helios init` for new projects, providing a clearer "Getting Started" guide.
- **Verified: CLI Component Removal**: Verified `helios remove` command supports interactive file deletion, `--yes` flag, and `--keep-files` flag.
- **MCP Server Enhancement**: Implemented MCP resources (documentation, assets, components) and tools (install/update/uninstall components) for agent integration.
- **Documentation Maintenance**: Updated Studio documentation to document `helios preview` command usage.
