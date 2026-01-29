# STUDIO Domain Context

**Version**: 0.48.1

## A. Architecture

Helios Studio is a web-based integrated development environment (IDE) for creating video compositions with the Helios engine. It follows a client-server architecture:

- **Server**: A Vite-based development server that serves the Studio UI and handles API requests for file operations (upload, delete, list compositions).
- **Client**: A React application that provides the visual interface (Timeline, Props Editor, Stage).
- **Integration**: The Studio integrates with `packages/core` (Engine) and `packages/player` (Web Component) to render and control the composition.

## B. File Tree

```
packages/studio/
├── bin/
│   └── studio.js          # CLI entry point
├── src/
│   ├── components/        # UI Components
│   │   ├── AssetsPanel/
│   │   ├── CaptionsPanel/
│   │   ├── Controls/
│   │   ├── Layout/
│   │   ├── PropsEditor/
│   │   ├── Sidebar/
│   │   ├── Stage/
│   │   └── Timeline/
│   ├── context/
│   │   └── StudioContext.tsx # Global state (Player, Assets, Compositions)
│   ├── server/            # Backend logic
│   │   ├── discovery.ts   # File system discovery
│   │   └── render-manager.ts # Render job management
│   ├── ui/                # Shared UI primitives
│   ├── utils/             # Helper functions
│   ├── App.tsx            # Main application component
│   └── cli.ts             # CLI implementation
├── vite-plugin-studio-api.ts # Vite middleware for API
├── vite.config.ts         # Vite configuration
└── package.json
```

## C. CLI Interface

The Studio is launched via the CLI:

```bash
npx helios studio [options]
```

- **Usage**: Starts the Studio server and opens the UI in the browser.
- **Environment**: Respects `HELIOS_PROJECT_ROOT` to determine the project directory.

## D. UI Components

- **Stage**: Renders the composition using `<helios-player>`. Supports zoom, pan, and safe area guides.
- **Timeline**: A track-based timeline for navigating time. Supports markers, loop range (In/Out), and scrubbing.
- **Props Editor**: A dynamic form for editing composition props. Supports schema-aware inputs (Color, Range, Boolean, Enum) and Asset inputs.
- **Assets Panel**: Displays assets from the project. Supports drag-and-drop upload and deletion.
- **Captions Panel**: interface for creating and editing subtitles/captions.
- **Renders Panel**: Manages render jobs (start, cancel, delete) and client-side exports.

## E. Integration

- **Core**: Uses `Helios` types (`HeliosSchema`, `CaptionCue`, `Marker`) for type safety.
- **Player**: Uses `HeliosController` to control playback (play, pause, seek) and listen to state changes.
- **Renderer**: Communicates with the backend to trigger FFmpeg renders via `render-manager.ts`.
