# Studio Context

## Architecture
The Studio is a browser-based development environment for Helios compositions. It runs on Vite and communicates with the backend via API endpoints provided by `vite-plugin-studio-api.ts`.
- **CLI**: `npx helios studio` (via `packages/cli` or similar) starts the Vite server.
- **Backend**: `vite-plugin-studio-api.ts` handles file system operations (discovery, creation, update, deletion of compositions and assets), render job management (persisted to disk), and hosts a **Model Context Protocol (MCP)** server for AI agent integration.
- **Frontend**: A React application located in `packages/studio/src`.
  - `StudioContext`: Centralized state management.
  - `Stage`: The main preview area using `<helios-player>`.
  - `Timeline`, `PropsEditor`, `AssetsPanel`, `RendersPanel`, `CaptionsPanel`: UI panels.
  - `CompositionSettingsModal`, `CreateCompositionModal`: Modals for composition lifecycle.

## File Tree
```
packages/studio
├── README.md
├── index.html
├── package.json
├── postcss.config.js
├── scripts
│   ├── verify-assets.ts
│   ├── verify-mcp.ts
│   └── verify-ui.ts
├── src
│   ├── App.tsx
│   ├── components
│   ├── context
│   ├── data
│   ├── hooks
│   ├── main.tsx
│   ├── server
│   │   ├── discovery.test.ts
│   │   ├── discovery.ts
│   │   ├── mcp.ts
│   │   ├── render-manager.test.ts
│   │   ├── render-manager.ts
│   │   ├── templates
│   │   │   ├── index.ts
│   │   │   ├── react.ts
│   │   │   ├── svelte.ts
│   │   │   ├── threejs.ts
│   │   │   ├── types.ts
│   │   │   ├── vanilla.ts
│   │   │   └── vue.ts
│   ├── setupTests.ts
│   ├── utils
│   └── vite-env.d.ts
├── tsconfig.json
├── vite-plugin-studio-api.ts
├── vite.config.ts
└── vitest.config.ts
```

## CLI Interface
`npx helios studio`
- Starts the Studio server.
- Scans the current directory (or `HELIOS_PROJECT_ROOT`) recursively for compositions.
- Watches for file changes and updates the UI (HMR).
- Exposes MCP endpoints at `/mcp/sse` and `/mcp/messages`.

## UI Components
- **Stage**: Visual preview with zoom, pan, safe area guides, and transparency toggle.
- **Timeline**: Track-based timeline with scrubbing, zooming, markers, and timecode display.
- **Props Editor**: Auto-generated inputs based on composition schema (supports recursive objects and arrays, collapsible groups, copy/reset tools, step constraints, specialized formats like date/color, and diverse asset types like model/json/shader).
- **Assets Panel**: Drag-and-drop asset management with search and type filtering. Prioritizes the `public` directory for asset discovery and generates relative URLs.
- **Renders Panel**: Manage render jobs (persistent across restarts), view error details for failed jobs, preview outputs in a modal, and download outputs.
- **Captions Panel**: Edit and export captions (SRT).
- **Diagnostics Panel**: View system capabilities (FFmpeg, GPU).
- **Composition Settings Modal**: Edit width, height, FPS, and duration of the active composition.
- **Render Preview Modal**: Instant playback of rendered video files.
- **Create Composition Modal**: Create new compositions using templates (Vanilla JS, React, Vue, Svelte, Three.js).
- **Global Shortcuts**: Configure keyboard shortcuts for actions.

## Integration
- **Core**: Uses `Helios` engine for rendering and schema definitions.
- **Player**: Uses `<helios-player>` for preview.
- **Renderer**: Communicates with `@helios-project/renderer` via backend API for exporting videos. Render jobs are persisted to `renders/jobs.json`.
- **MCP**: Exposes Studio capabilities to AI agents via `helios://compositions` resource and `render_composition`/`create_composition` tools (SSE/JSON-RPC).
