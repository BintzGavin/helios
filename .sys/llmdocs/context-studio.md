# Helios Studio Context

## A. Architecture

Helios Studio is a browser-based development environment for creating video compositions. It is built as a Vite-based React application that runs locally.

### Components
1.  **CLI Wrapper**: The `studio` command (in `@helios-project/cli`) launches the Studio. It injects the `HELIOS_PROJECT_ROOT` environment variable to point Studio to the user's project directory.
2.  **Dev Server (Vite)**: serves the Studio UI and provides a backend API via `vite-plugin-studio-api.ts`.
3.  **Backend API**:
    -   Discovery: Scans the file system for compositions (`composition.html`) and assets.
    -   Rendering: Manages `Renderer` instances to export video files. Supports job cancellation and deletion.
4.  **Frontend (React)**:
    -   **StudioContext**: Centralized state management for player, active composition, and render jobs.
    -   **HeliosPlayer**: The `<helios-player>` web component is used for previewing compositions.

## B. File Tree

```
packages/studio/
├── src/
│   ├── components/
│   │   ├── AssetsPanel/
│   │   ├── PropsEditor/
│   │   ├── RendersPanel/
│   │   ├── Stage/
│   │   └── Timeline/
│   ├── context/
│   │   └── StudioContext.tsx
│   ├── server/
│   │   ├── discovery.ts
│   │   └── render-manager.ts
│   ├── App.tsx
│   └── main.tsx
├── vite-plugin-studio-api.ts
├── vite.config.ts
└── package.json
```

## C. CLI Interface

The Studio is typically launched via the CLI package:

```bash
npx helios studio
```

-   **Environment Variables**:
    -   `HELIOS_PROJECT_ROOT`: Specifies the root directory to scan for compositions. Defaults to `process.cwd()` if set by the CLI, otherwise internal examples.

## D. UI Components

-   **Stage**: The central preview area containing the `<helios-player>`. Supports pan/zoom and resolution visualization.
-   **Timeline**: Provides playback controls (Play, Pause, Scrub), time display, and range markers (In/Out points).
-   **Props Editor**: A dynamic form/JSON editor that allows users to modify the `inputProps` passed to the composition in real-time.
-   **Renders Panel**: Displays a list of active and completed render jobs with progress bars. Supports cancelling active jobs and deleting completed/failed jobs.
-   **Assets Panel**: Lists available assets (images, video, audio) found in the project.
-   **Render Configuration**: UI controls for setting output resolution, framerate, video bitrate, codec, and format.

## E. Integration

-   **Core**: Studio does not directly import Core; instead, it serves compositions that use Core.
-   **Player**: Studio wraps `@helios-project/player` (`<helios-player>`) to handle composition playback and state synchronization.
-   **Renderer**: Studio's backend (`render-manager.ts`) imports `@helios-project/renderer` to execute video rendering tasks.
    -   **Data Flow**: UI -> `StudioContext` -> `POST /api/render` -> `render-manager` -> `Renderer`.
    -   **Input Props**: Studio injects `inputProps` into the render job, which the Renderer injects into the browser context.
    -   **Job Management**: `StudioContext` exposes `cancelRender` and `deleteRender` methods which call `POST /api/jobs/:id/cancel` and `DELETE /api/jobs/:id`.
