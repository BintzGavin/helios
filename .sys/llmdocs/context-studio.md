# Studio Context

## Section A: Architecture

The Studio is a browser-based development environment for Helios. It consists of:
1.  **CLI**: Entry point (`helios studio`) that launches the dev server.
2.  **Server**: A Vite-based dev server (`packages/studio/src/server`) that serves the UI and provides API endpoints for filesystem operations (compositions, assets, renders).
3.  **UI**: A React-based Single Page Application (`packages/studio/src/ui` or root `src`) that provides the IDE interface.
4.  **Integration**:
    -   **Core**: Consumed via `Helios` class for composition logic.
    -   **Player**: Consumed via `<helios-player>` for preview and playback.
    -   **Renderer**: Used by the backend to execute FFmpeg render jobs.

## Section B: File Tree

```
packages/studio/
├── bin/                # CLI entry point
├── src/
│   ├── cli/            # CLI plugin integration
│   ├── components/     # UI Components (Sidebar, Stage, Timeline, etc.)
│   ├── context/        # React Context (StudioContext, ToastContext)
│   ├── hooks/          # Custom hooks (usePersistentState)
│   ├── server/         # Backend logic (discovery, render-manager)
│   ├── utils/          # Utilities
│   ├── App.tsx         # Main UI entry
│   ├── main.tsx        # React root
│   └── types.ts        # Type definitions
├── index.html          # Vite entry HTML
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Section C: CLI Interface

Command: `npx helios studio`

Options:
-   `--port <number>`: Port to run the server on (default: 5173).
-   `--open`: Open browser on start.

## Section D: UI Components

-   **Sidebar**: Navigation tabs (Compositions, Assets, Components, Captions, Audio, Renders).
-   **Stage**: Main preview area containing `<helios-player>`.
-   **Timeline**: Track-based timeline for scrubbing and editing.
-   **PropsEditor**: Form for editing composition input props (`HeliosSchema`).
-   **RendersPanel**: Configures and manages render jobs.
    -   **RenderConfig**: Settings for Mode, Bitrate, Codec, Concurrency (with Presets).
-   **AssetsPanel**: Drag-and-drop asset management.
-   **Omnibar**: Command palette (Cmd+K).

## Section E: Integration

-   **StudioContext**: Central store for Studio state (compositions, assets, render jobs, player state).
-   **HeliosPlayer**: The web component used for playback. Studio controls it via `HeliosController`.
-   **Backend API**:
    -   `GET /api/compositions`: List available compositions.
    -   `POST /api/render`: Submit a render job.
    -   `GET /api/jobs`: List render jobs.
    -   `GET /api/assets`: List assets.
