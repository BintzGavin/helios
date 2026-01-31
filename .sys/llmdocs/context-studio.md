# Studio Context

## A. Architecture

Helios Studio is a browser-based development environment for video composition. It allows users to:
1.  **Compose**: Edit composition properties (duration, FPS) and inputs (props) in real-time.
2.  **Preview**: See instant feedback using `<helios-player>` with Hot Module Reloading (HMR).
3.  **Render**: Queue and manage high-quality video renders via `@helios-project/renderer`.

**Core Components:**
-   **CLI**: `npx helios studio` starts the Vite-based dev server.
-   **Server**: A Vite plugin (`vite-plugin-studio-api.ts`) provides API endpoints for filesystem access (assets, compositions) and render management.
-   **UI**: A React application (`packages/studio/src`) that consumes the API and controls the Player.
-   **Communication**: The UI communicates with the Player via the `HeliosController` bridge (postMessage) and with the Server via HTTP API.

## B. File Tree

```
packages/studio/
├── bin/                 # CLI entry point
├── src/
│   ├── components/      # UI Components (Timeline, PropsEditor, etc.)
│   │   ├── AssetsPanel/
│   │   ├── CaptionsPanel/
│   │   ├── Controls/
│   │   ├── RendersPanel/
│   │   ├── Stage/
│   │   ├── PropsEditor.tsx
│   │   └── SchemaInputs.tsx
│   ├── context/         # React Context (StudioContext)
│   ├── hooks/           # Custom Hooks
│   ├── server/          # Backend Logic (Discovery, RenderManager)
│   ├── utils/           # Shared Utilities
│   ├── App.tsx          # Main Layout
│   └── main.tsx         # Entry Point
├── vite-plugin-studio-api.ts # Vite Plugin for Backend API
└── vite.config.ts       # Vite Configuration
```

## C. CLI Interface

The Studio is launched via the `helios` CLI:

```bash
npx helios studio [options]
```

**Options:**
-   `--port <number>`: Port to run the server on (default: 3000 or 5173).
-   `--open`: Open browser on start.

The CLI uses `HELIOS_PROJECT_ROOT` environment variable to determine the project root for discovering compositions and assets.

## D. UI Components

-   **Stage**: Wraps `<helios-player>` and provides canvas controls (Zoom, Pan, Safe Areas).
-   **Timeline**: Visualizes playback progress, markers, and captions. Supports seeking and scrubbing.
-   **Props Editor**: auto-generated form based on the composition's `HeliosSchema`.
    -   Supports primitives (string, number, boolean).
    -   Supports assets (image, video, audio).
    -   Supports complex types (object, array, typed arrays).
    -   Supports collapsible groups via `group` property.
-   **Assets Panel**: Discovers and allows drag-and-drop of assets from the project.
-   **Renders Panel**: Manages render jobs (Start, Cancel, Download).
-   **Captions Panel**: Edits SRT captions and syncs with Core.

## E. Integration

**With Core:**
-   Studio consumes `HeliosSchema` to generate the Props Editor.
-   Studio injects `inputProps` into the Player via `controller.setInputProps()`.

**With Player:**
-   Studio embeds `<helios-player>` in the Stage.
-   Studio controls playback via `HeliosController` (Play, Pause, Seek).

**With Renderer:**
-   Studio triggers renders via POST `/api/render`.
-   The backend spawns a Renderer process (using `RenderManager`) to generate MP4/WebM files.
-   Render progress is polled via GET `/api/render`.
