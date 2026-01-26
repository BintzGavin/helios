# Context: Studio Domain

## A. Architecture

The Studio is a browser-based development environment (IDE) for Helios video compositions. It allows users to:
1.  **Preview** compositions in real-time.
2.  **Edit** input props via a visual editor.
3.  **Render** videos to disk (via backend integration).
4.  **Manage** rendering jobs and assets.

It consists of:
-   **CLI**: `@helios-project/cli` (via `npx helios studio`) starts the development server.
-   **Server**: A Vite development server with custom middleware (`vite-plugin-studio-api`) that serves the UI and handles API requests (rendering, file listing).
-   **UI**: A React-based Single Page Application (SPA) that consumes the `Helios` core and player.

## B. File Tree

```
packages/studio/
├── bin/
│   └── studio.js          # CLI entry point
├── src/
│   ├── cli.ts             # CLI implementation (starts Vite server)
│   ├── server.ts          # Vite server configuration & API middleware
│   ├── vite-plugin-studio-api.ts # Backend API implementation
│   ├── render-manager.ts  # Render job queue & FFmpeg management
│   ├── main.tsx           # React entry point
│   ├── App.tsx            # Main application layout & global shortcuts
│   ├── context/
│   │   └── StudioContext.tsx # Global state (active composition, player state, render jobs)
│   ├── components/
│   │   ├── Layout/        # Layout components (Panel, StudioLayout)
│   │   ├── Controls/      # Playback controls (Play, Pause, Step, Loop)
│   │   ├── Stage/         # Canvas/Player wrapper with Zoom/Pan
│   │   ├── Timeline.tsx   # Scrubbable timeline with In/Out markers
│   │   ├── PropsEditor.tsx# JSON/Form editor for input props
│   │   ├── CompositionSwitcher.tsx # Cmd+K switcher
│   │   ├── RendersPanel/  # Render job list & configuration
│   │   └── AssetsPanel/   # Asset browser
│   └── hooks/
│       └── useKeyboardShortcut.ts
└── package.json
```

## C. CLI Interface

Run the studio from your project root:
```bash
npx helios studio
```
This starts the local development server (default port 5173) and opens the browser.
Env vars:
- `HELIOS_PROJECT_ROOT`: Path to the project root (default: current working directory).

## D. UI Components

-   **Stage**: The main preview area. Wraps `<helios-player>`. Supports Pan, Zoom, Transparency Grid, and Resolution presets.
-   **Timeline**: Shows current playback position. Supports scrubbing, In/Out point setting (I/O keys), and frame-accurate seeking.
-   **PlaybackControls**: Play/Pause, Rewind, Previous/Next Frame (< / >), Loop, and Playback Speed.
-   **PropsEditor**: Auto-generates form inputs based on the composition's `inputProps`. Supports rich JSON editing.
-   **Sidebar**:
    -   **Assets**: Lists image/video assets in the project.
    -   **Renders**: Configures render settings (Mode, Bitrate, Codec), starts render jobs, and lists job status (Queued, Rendering, Done, Failed).
-   **CompositionSwitcher**: A global command palette (Cmd+K) to switch between detected compositions.

## E. Integration

-   **Core**: Consumes `Helios` types and logic.
-   **Player**: Embeds `<helios-player>` web component. Controls it via `HeliosController`.
-   **Renderer**: The backend (`render-manager.ts`) uses `@helios-project/renderer` to execute render jobs using FFmpeg or Headless Chrome.
-   **Communication**:
    -   **Frontend -> Backend**: HTTP calls to `/api/assets`, `/api/compositions`, `/api/render`.
    -   **Backend -> Frontend**: Vite HMR for code updates; Polling for render job status.
