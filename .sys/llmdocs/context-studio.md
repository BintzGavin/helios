# Context: Studio Domain

**Package**: `packages/studio`
**Description**: The browser-based development environment for Helios compositions.

## A. Architecture
The Studio is a React 19 application built with Vite. It serves as the IDE for video composition, providing a live preview, property controls, and timeline management.
- **Entry Point**: `packages/studio/index.html` -> `src/main.tsx`
- **Framework**: React 19
- **Build Tool**: Vite
- **Preview**: Integrated via `<helios-player>` web component.
- **State Management**: React state synced with `<helios-player>` controller.

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
    └── components/
        ├── PropsEditor.tsx
        ├── Timeline.tsx
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
- **Main Layout**: `App.tsx` orchestrates the layout and manages player state.
- **StudioLayout**: `components/Layout/StudioLayout.tsx` defines the grid areas (header, sidebar, stage, inspector, timeline).
- **Panel**: `components/Layout/Panel.tsx` is a generic container for UI panels.
- **Timeline**: `components/Timeline.tsx` provides playback controls (Play/Pause, Seek) and time display.
- **PropsEditor**: `components/PropsEditor.tsx` provides inputs to modify composition properties (`inputProps`).
- **Preview Pane**: Uses `<helios-player>` in the stage area, controlled via `HeliosController`.

## E. Integration
- **Player**: Imports `@helios-project/player` to register the web component and access `HeliosController`.
- **CLI**: The `@helios-project/cli` package acts as a launcher for the Studio.
- **Core**: Indirectly uses Core via Player.
