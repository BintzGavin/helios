# Studio Context

## A. Architecture

Helios Studio is a web-based IDE for creating and previewing video compositions. It integrates with `@helios-project/core` for state management and `@helios-project/player` for preview rendering.

- **Vite Plugin API (`vite-plugin-studio-api.ts`)**: Serves as the backend for the Studio UI, handling local file system operations, composition discovery, and asset management.
- **Studio UI (`src/components/`)**: A React-based interface built to orchestrate the player and edit the active composition state.
- **Context Management (`StudioContext.tsx`)**: Bridges the Vite backend APIs, the Helios Player instance, and UI state.

## B. File Tree

```
packages/studio/
├── bin/                 # CLI entry points
├── docs/                # Domain documentation
├── src/
│   ├── components/      # React UI Components
│   │   ├── AssetsPanel/
│   │   ├── CompositionsPanel/
│   │   ├── Controls/
│   │   ├── Stage/
│   │   ├── Timeline/
│   │   └── ...
│   ├── context/         # React Context Providers
│   ├── hooks/           # Custom React Hooks
│   ├── server/          # Backend APIs (Render Manager, Discovery)
│   ├── utils/           # Shared utilities
│   └── App.tsx          # Main Application Entry
├── vite.config.ts       # Studio UI build config
└── vite-plugin-studio-api.ts # Backend API middleware
```

## C. CLI Interface

The Studio package provides a CLI command to launch the environment.

`npx helios studio [options]`

Options:
- `-p, --port <number>`: Port to run the studio server on (default: 3000)
- `--host`: Expose server to network

The CLI command automatically resolves `HELIOS_PROJECT_ROOT` to the directory where the command was run, allowing it to discover user compositions and assets.

## D. UI Components

- **Stage**: Main preview area containing the `<helios-player>` and visual safe-area guides.
- **Timeline**: Visual representation of the composition's duration, active clips, and audio tracks. Supports drag-and-drop from the Assets panel.
- **Props Editor**: Dynamic property editor generated from the active composition's schema, including specialized inputs for ranges, colors, and assets.
- **Assets Panel**: File explorer for managing media assets, 3D models, fonts, and shaders with drag-and-drop upload and moving capabilities.
- **Compositions Panel**: Explorer for switching between discovered compositions and creating new ones.
- **Renders Panel**: Interface for configuring and launching rendering jobs via the `@helios-project/renderer` package.
- **Diagnostics Panel**: System diagnostics panel showing both Client (Preview) and Server (Renderer) capabilities.

## E. Integration

- **Core**: Uses `Helios` classes for logic, and relies on `controller.setCaptions` or `inputProps` injection to manage state dynamically.
- **Player**: The Studio Stage renders the `<helios-player>` web component directly, controlling it via the DOM API for playback (play, pause, seek).
- **Renderer**: The Studio's backend Vite plugin communicates with the renderer package to execute jobs locally when requested via the UI, saving outputs to the user's project folder.
