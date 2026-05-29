# Context: Studio Domain
**Domain**: `packages/studio`
**Role**: Studio CLI and browser-based development environment

## Section A: Architecture
Studio is a comprehensive browser-based development environment that enables users to:
1. Preview compositions in real-time with hot-reloading.
2. Interactively modify input properties via a schema-driven GUI.
3. Use a timeline for playback control and scrubbing.
4. Execute real renderer jobs directly from the UI.
5. Manage assets and mock compositions.

The architecture comprises three main parts:
- **CLI/Backend (`src/server` & `src/cli`)**: A Vite-based local development server that exposes a plugin to provide API endpoints (e.g., `/api/assets`, `/api/render`, `/api/compositions`) and manages project discovery and MCP tools.
- **Frontend App (`src/App.tsx` & `src/ui`):** A React-based web interface built using Vite. It hosts various panels (Timeline, Inspector, Assets, Compositions, Renders) that let users interact with the current `HeliosPlayer`.
- **Context Manager (`src/context/StudioContext.tsx`):** Centralized state management linking the frontend UI, the underlying `<helios-player>`, and the backend API.

## Section B: File Tree
```
packages/studio/
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── AssetsPanel/       # Drag and Drop asset management
│   │   ├── CompositionsPanel/ # Command-K composition switcher
│   │   ├── Stage/             # Render preview, Safe Area Guides
│   │   ├── RendersPanel/      # Job execution and status
│   │   ├── Inspector/         # Schema-driven props editor
│   │   ├── Timeline/          # Playback scrubbing, markers, zoom
│   │   └── Controls/          # Playback speed, Timecode Input
│   ├── context/
│   │   ├── StudioContext.tsx  # Centralized application state
│   │   └── ToastContext.tsx   # Notification system
│   ├── server/                # Backend Vite plugin API
│   │   ├── plugin.ts          # Express-like API routes for Vite
│   │   ├── render-manager.ts  # Executes @helios-project/renderer jobs
│   │   ├── discovery.ts       # Discovers assets/compositions in HELIOS_PROJECT_ROOT
│   │   ├── documentation.ts   # Integrates MCP skill documentation
│   │   └── mcp.ts             # Model Context Protocol integration
│   ├── cli/                   # CLI Entry points
│   └── App.tsx                # Main Application Layout
├── index.html                 # App Entry
├── vite.config.ts             # Client Build Config
└── vite.config.cli.ts         # Server/Plugin Build Config
```

## Section C: CLI Interface
```typescript
/**
 * Starts the Studio dev server in the user's project workspace.
 * Resolves HELIOS_PROJECT_ROOT to process.cwd()
 */
// helios studio [--port 3000]
```

## Section D: UI Components
The Studio UI is composed of several interactive panels:
- **Stage**: Renders the `<helios-player>` with pan/zoom/transparency and Safe Area Guides.
- **Timeline**: A resizable timeline track providing playback scrubbing, playhead precision, loop controls (I/O), and timeline markers. Allows dragging and dropping of assets.
- **Inspector / Props Editor**: Generates inputs dynamically from the active composition's `HeliosSchema`. Supports dragging assets onto typed inputs.
- **Assets Panel**: Previews discovered local assets (images, audio, video, fonts). Supports adding, renaming, and deleting files.
- **Compositions Panel**: Lists available compositions and allows project switching, creation, deletion, and template scaffolding.
- **Renders Panel**: Manages remote and local render jobs, exporting, and monitoring FFmpeg output streams via the server API.
- **Captions Panel**: Edits SRT caption cues in real-time, injecting them into the composition logic.

## Section E: Integration
- **@helios-project/core**: Studio extracts the `HeliosSchema` to generate the Inspector GUI. It also passes `inputProps` dynamically back into the composition.
- **@helios-project/player**: Studio wraps the Web Component `<helios-player>` and controls its methods (play, pause, seek, setInputProps, snapshot).
- **@helios-project/renderer**: Studio constructs render specs (`RenderOptions`) and dispatches them to `RenderOrchestrator` via the Vite backend API (`/api/render/run`), tracking progress through WebSocket or SSE logs.
