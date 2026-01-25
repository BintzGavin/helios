# Context: Studio Domain

**Package**: `packages/studio`
**Description**: The browser-based development environment for Helios compositions.

## A. Architecture
The Studio is a React 19 application built with Vite. It serves as the IDE for video composition, providing a live preview, property controls, and timeline management.
- **Entry Point**: `packages/studio/index.html` -> `src/main.tsx`
- **Framework**: React 19
- **Build Tool**: Vite
- **Preview**: Integrated via `<helios-player>` web component, wrapped in a `Stage` component for zoom/pan controls.
- **State Management**: `StudioContext` provides centralized access to `HeliosController`, player state (frame, playing, props), and Studio settings (loop, active composition, assets, render jobs).

## B. File Tree
```
packages/studio/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── vite-env.d.ts
    ├── context/
    │   └── StudioContext.tsx
    ├── hooks/
    │   └── useKeyboardShortcut.ts
    └── components/
        ├── CompositionSwitcher.tsx
        ├── PropsEditor.tsx
        ├── Timeline.tsx
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
- **StudioProvider**: `context/StudioContext.tsx` wraps the application to provide state.
- **Main Layout**: `App.tsx` initializes the `HeliosController` connection and handles layout composition.
- **StudioLayout**: `components/Layout/StudioLayout.tsx` defines the grid areas (header, sidebar, stage, inspector, timeline).
- **Sidebar**: `components/Sidebar/Sidebar.tsx` manages tabs (Assets, Renders) in the sidebar area.
- **AssetsPanel**: `components/AssetsPanel/AssetsPanel.tsx` displays a grid of available assets (currently mocked).
- **RendersPanel**: `components/RendersPanel/RendersPanel.tsx` displays a list of render jobs and status.
- **Stage**: `components/Stage/Stage.tsx` wraps `<helios-player>`, handling controller connection, zoom, pan, and transparency toggling.
- **StageToolbar**: `components/Stage/StageToolbar.tsx` provides floating controls for the Stage.
- **Panel**: `components/Layout/Panel.tsx` is a generic container for UI panels.
- **Timeline**: `components/Timeline.tsx` provides the scrubber and time display.
- **PlaybackControls**: `components/Controls/PlaybackControls.tsx` provides Play, Pause, Rewind, and Loop controls.
- **PropsEditor**: `components/PropsEditor.tsx` provides inputs to modify composition properties (`inputProps`).
- **CompositionSwitcher**: `components/CompositionSwitcher.tsx` allows switching between active compositions.

## E. Integration
- **Player**: Imports `@helios-project/player` to register the web component and access `HeliosController`.
- **CLI**: The `@helios-project/cli` package acts as a launcher for the Studio.
- **Core**: Indirectly uses Core via Player.
