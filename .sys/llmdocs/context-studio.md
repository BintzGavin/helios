# Context: Studio Domain

**Package**: `packages/studio`
**Description**: The browser-based development environment for Helios compositions.

## A. Architecture
The Studio is a React 19 application built with Vite. It serves as the IDE for video composition, providing a live preview, property controls, and timeline management.
- **Entry Point**: `packages/studio/index.html` -> `src/main.tsx`
- **Backend API**: A custom Vite plugin (`vite-plugin-studio-api.ts`) provides `/api/compositions` and `/api/assets` endpoints, serving files from the `examples/` directory using `/@fs` paths.
- **Framework**: React 19
- **Build Tool**: Vite
- **Preview**: Integrated via `<helios-player>` web component, wrapped in a `Stage` component for zoom/pan controls.
- **State Management**: `StudioContext` provides centralized access to `HeliosController`, player state (frame, playing, props), and Studio settings (loop, active composition, assets, render jobs, timeline range, canvas size).

## B. File Tree
```
packages/studio/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vite-plugin-studio-api.ts
├── index.html
├── scripts/
│   └── verify-assets.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── vite-env.d.ts
    ├── server/
    │   └── discovery.ts
    ├── context/
    │   └── StudioContext.tsx
    ├── hooks/
    │   └── useKeyboardShortcut.ts
    └── components/
        ├── CompositionSwitcher.tsx
        ├── PropsEditor.tsx
        ├── PropsEditor.css
        ├── Timeline.tsx
        ├── Timeline.css
        ├── Sidebar/
        │   ├── Sidebar.css
        │   └── Sidebar.tsx
        ├── AssetsPanel/
        │   ├── AssetItem.tsx
        │   └── AssetsPanel.tsx
        ├── RendersPanel/
        │   ├── RendersPanel.css
        │   └── RendersPanel.tsx
        ├── Controls/
        │   └── PlaybackControls.tsx
        ├── Stage/
        │   ├── Stage.css
        │   ├── Stage.tsx
        │   └── StageToolbar.tsx
        └── Layout/
            ├── Panel.tsx
            ├── StudioLayout.css
            └── StudioLayout.tsx

packages/cli/
├── package.json
├── tsconfig.json
├── bin/
│   └── helios.js
└── src/
    ├── index.ts
    └── commands/
        └── studio.ts
```

## C. CLI Interface
The studio can be launched via the Helios CLI.
- `npx helios studio`: Launches the Studio development server.

Internal scripts:
- `npm run dev -w packages/studio`: Starts the development server directly.
- `npm run build -w packages/studio`: Builds the application.

## D. UI Components
- **StudioProvider**: `context/StudioContext.tsx` wraps the application to provide state, including timeline range, canvas resolution (`canvasSize`), and composition data fetched from `/api/compositions`.
- **Main Layout**: `App.tsx` initializes the `HeliosController` connection, handles layout composition, and registers global keyboard shortcuts (Space, Arrows, Home).
- **StudioLayout**: `components/Layout/StudioLayout.tsx` defines the grid areas (header, sidebar, stage, inspector, timeline).
- **Sidebar**: `components/Sidebar/Sidebar.tsx` manages tabs (Assets, Renders) in the sidebar area.
- **AssetsPanel**: `components/AssetsPanel/AssetsPanel.tsx` displays a grid of available assets (fetched from `/api/assets`).
- **RendersPanel**: `components/RendersPanel/RendersPanel.tsx` displays a list of render jobs and status.
- **Stage**: `components/Stage/Stage.tsx` wraps `<helios-player>`, handling controller connection, zoom, pan, and transparency toggling. It applies specific pixel dimensions to the player based on the configured canvas size.
- **StageToolbar**: `components/Stage/StageToolbar.tsx` provides floating controls for the Stage, including zoom, transparency, and resolution controls (presets + custom input).
- **Panel**: `components/Layout/Panel.tsx` is a generic container for UI panels.
- **Timeline**: `components/Timeline.tsx` provides a visual timeline with draggable in/out markers and keyboard shortcuts (I/O).
- **PlaybackControls**: `components/Controls/PlaybackControls.tsx` provides Play, Pause, Rewind, Loop, and Speed (0.25x - 4x) controls.
- **PropsEditor**: `components/PropsEditor.tsx` provides inputs to modify composition properties (`inputProps`). Supports primitive types (string, number, boolean, color) and complex types (objects, arrays) via a JSON editor.
- **CompositionSwitcher**: `components/CompositionSwitcher.tsx` allows switching between active compositions.

## E. Integration
- **Backend**: Vite plugin scans the project root (default: `examples/`, configurable via `HELIOS_PROJECT_ROOT` env var) via `findCompositions` and `findAssets` (in `src/server/discovery.ts`) and serves files via `/@fs` to support dynamic project discovery.
- **Player**: Imports `@helios-project/player` to register the web component and access `HeliosController`.
- **CLI**: The `@helios-project/cli` package acts as a launcher for the Studio.
- **Core**: Indirectly uses Core via Player.
