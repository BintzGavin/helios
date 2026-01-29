# STUDIO Domain Context

## A. Architecture
Helios Studio is a browser-based development environment for video composition. It consists of:
1.  **CLI (`packages/studio/bin` or `packages/cli`)**: Launches the Vite development server.
2.  **Dev Server (`src/server/`)**: A Vite-based server that handles:
    *   Dynamic discovery of composition files (`discovery.ts`).
    *   Asset management (`discovery.ts`).
    *   Render job management (`render-manager.ts`).
    *   Serving the Studio UI and compositions.
3.  **Studio UI (`src/ui/`)**: A React-based Single Page Application (SPA) that provides:
    *   Timeline for playback control and scrubbing.
    *   Stage for visual preview (using `<helios-player>`).
    *   Props Editor for modifying composition inputs in real-time.
    *   Assets Panel for managing media files.
    *   Renders Panel for exporting videos.
    *   Diagnostics Panel for system health.

The Studio operates in "Tool Mode" when run via `npx helios studio`, using the current working directory (`process.cwd()`) or `HELIOS_PROJECT_ROOT` to locate user compositions.

## B. File Tree
```
packages/studio/
├── src/
│   ├── components/       # React UI components (Timeline, Stage, PropsEditor, etc.)
│   ├── context/          # State management (StudioContext.tsx)
│   ├── server/           # Backend logic (Node.js)
│   │   ├── discovery.ts  # File system scanning for compositions/assets
│   │   ├── render-manager.ts # Render job orchestration
│   │   └── templates/    # Composition templates (Vanilla, React, Vue, Svelte)
│   ├── App.tsx           # Main UI entry point
│   └── main.tsx          # React root
├── vite-plugin-studio-api.ts # Vite plugin exposing API endpoints
├── vite.config.ts        # Vite configuration
└── index.html            # Studio HTML entry
```

## C. CLI Interface
**Command**: `npx helios studio`
**Description**: Starts the Helios Studio development server.
**Environment Variables**:
*   `HELIOS_PROJECT_ROOT`: Overrides the root directory for scanning compositions and assets (defaults to `process.cwd()`).

## D. UI Components
*   **Stage**: Displays the `<helios-player>` with pan/zoom controls and safe area guides.
*   **Timeline**: Provides playback controls, scrubbing, timecode display, loop range, and markers.
*   **Props Editor**: auto-generated form inputs based on the composition's Schema (supports JSON, primitive types, assets).
*   **Assets Panel**: Lists available images, videos, audio, fonts, and 3D models. Supports Drag & Drop upload.
*   **Renders Panel**: Manages render jobs (Canvas/DOM modes) and client-side exports.
*   **Captions Panel**: Allows editing and exporting (SRT) captions.
*   **Diagnostics**: Shows system and browser capabilities.

## E. Integration
*   **Core**: Consumes `Helios` instance for state (time, duration, fps).
*   **Player**: Uses `<helios-player>` component for rendering the composition in the Stage.
*   **Renderer**: API endpoints (`/api/render`) trigger backend render jobs using `@helios-project/renderer`.
*   **State Sync**: `StudioContext` synchronizes state between the UI and the `HeliosController` (e.g., seeking, playing/pausing).
