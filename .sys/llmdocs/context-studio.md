# STUDIO DOMAIN CONTEXT

## A. Architecture

Helios Studio is a browser-based development environment for creating and editing video compositions. It is built as a Vite application that can be run via the CLI.

- **Dev Server**: Uses Vite with a custom plugin (`studioApiPlugin`) to serve the Studio UI and handle API requests (e.g., file operations, asset discovery, rendering, documentation serving).
- **Frontend**: A React-based Single Page Application (SPA) that communicates with the dev server.
- **State Management**: Uses React Context (`StudioContext`) to manage application state (active composition, timeline, playback).
- **Integration**: Embeds `<helios-player>` to preview compositions and synchronizes state with the Helios Core instance.

## B. File Tree

packages/studio/
├── bin/                 # CLI entry point (helios-studio)
├── scripts/             # Verification and build scripts
├── src/
│   ├── cli/             # CLI plugin logic
│   ├── components/      # React UI components
│   │   ├── CompositionsPanel/ # Compositions panel
│   │   ├── assets/      # Assets panel
│   │   ├── layout/      # Application layout
│   │   ├── props/       # Props editor
│   │   ├── renders/     # Renders panel
│   │   ├── stage/       # Preview stage
│   │   └── timeline/    # Timeline editor
│   ├── contexts/        # React contexts (StudioContext, ToastContext)
│   ├── hooks/           # Custom hooks
│   ├── server/          # Backend logic (API handlers, RenderManager)
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Entry point
├── index.html           # HTML entry point
├── package.json         # Package configuration
├── vite.config.ts       # Vite configuration
└── vitest.config.ts     # Test configuration

## C. CLI Interface

The Studio is launched via the Helios CLI:

```bash
npx helios studio [options]
```

Options:
- `--port <number>`: Specify the port to run the Studio server (default: 5173).
- `--open`: Open the Studio in the default browser on start.

## D. UI Components

- **Sidebar**: Navigation between different panels (Assets, Renders, Settings).
- **Stage**: The main preview area displaying the `<helios-player>` component. Includes controls for zoom, pan, and safe areas.
- **Timeline**: A multi-track timeline for visualization and scrubbing. Supports audio waveforms and markers.
- **Props Editor**: A schema-aware editor for modifying composition input props in real-time.
- **Assets Panel**: Allows browsing and dragging assets (images, video, audio) into the composition.
- **Renders Panel**: Manages render jobs (start, cancel, delete) and displays progress/results.
- **Omnibar**: A command palette (Cmd+K) for quick navigation and actions.
- **Helios Assistant**: An AI-powered assistant for documentation and help, accessible via the toolbar.

## E. Integration

- **Core**: The Studio loads compositions which instantiate `Helios` core. It inspects the `helios.config` and composition state.
- **Player**: The Studio wraps the `@helios-project/player` web component to provide playback and preview capabilities.
- **Renderer**: The Studio uses `@helios-project/renderer` (via `RenderManager` on the server) to execute render jobs. It manages the `RenderOrchestrator` for distributed or local rendering.
