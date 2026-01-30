# Studio Context

## Architecture
The Studio is a browser-based development environment for Helios compositions. It runs on Vite and communicates with the backend via API endpoints provided by `vite-plugin-studio-api.ts`.
- **CLI**: `npx helios studio` (via `packages/cli` or similar) starts the Vite server.
- **Backend**: `vite-plugin-studio-api.ts` handles file system operations (discovery, creation, update, deletion of compositions and assets) and render job management.
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
│   └── verify-ui.ts
├── src
│   ├── App.tsx
│   ├── components
│   ├── context
│   ├── data
│   ├── hooks
│   ├── main.tsx
│   ├── server
│   ├── setupTests.ts
│   ├── utils
│   └── vite-env.d.ts
├── tsconfig.json
├── verification.png
├── vite-plugin-studio-api.ts
├── vite.config.ts
└── vitest.config.ts
```

## CLI Interface
`npx helios studio`
- Starts the Studio server.
- Scans the current directory (or `HELIOS_PROJECT_ROOT`) for compositions.
- Watches for file changes and updates the UI (HMR).

## UI Components
- **Stage**: Visual preview with zoom, pan, safe area guides, and transparency toggle.
- **Timeline**: Track-based timeline with scrubbing, zooming, markers, and timecode display.
- **Props Editor**: Auto-generated inputs based on composition schema (supports recursive objects and arrays).
- **Assets Panel**: Drag-and-drop asset management.
- **Renders Panel**: Manage render jobs and download outputs.
- **Captions Panel**: Edit and export captions (SRT).
- **Diagnostics Panel**: View system capabilities (FFmpeg, GPU).
- **Composition Settings Modal**: Edit width, height, FPS, and duration of the active composition.
- **Global Shortcuts**: Configure keyboard shortcuts for actions.

## Integration
- **Core**: Uses `Helios` engine for rendering and schema definitions.
- **Player**: Uses `<helios-player>` for preview.
- **Renderer**: Communicates with `@helios-project/renderer` via backend API for exporting videos.
