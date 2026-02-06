# Studio Context

## Section A: Architecture

The Studio is a browser-based development environment for Helios. It consists of:
1.  **CLI**: Entry point (`helios studio`) that launches the dev server.
2.  **Server**: A Vite-based dev server (`packages/studio/src/server`) that serves the UI and provides API endpoints for filesystem operations (compositions, assets, renders) and documentation discovery (READMEs, Agent Skills).
3.  **UI**: A React-based Single Page Application (`packages/studio/src`) that provides the IDE interface.
4.  **Integration**:
    -   **Core**: Consumed via `Helios` class for composition logic.
    -   **Player**: Consumed via `<helios-player>` for preview and playback.
    -   **Renderer**: Used by the backend to execute FFmpeg render jobs.

## Section B: File Tree

```
packages/studio/
├── bin/                # CLI entry point
├── src/
│   ├── components/     # UI Components
│   │   ├── Layout/     # Layout system (StudioLayout, Resizer)
│   │   ├── Sidebar/    # Sidebar panels
│   │   ├── Stage/      # Preview area
│   │   └── Timeline/   # Timeline area
│   ├── context/        # React Context (StudioContext, ToastContext)
│   ├── hooks/          # Custom hooks (usePersistentState)
│   ├── server/         # Backend logic (discovery, render-manager, plugin, documentation)
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

The CLI is available via `npx helios <command>`.

Commands:
-   `studio`: Launches the Studio development environment.
    -   Options: `--port <number>`, `--open`
-   `init`: Scaffolds a new Helios project.
    -   Options: `-y` (yes), `--framework <name>`
-   `add <component>`: Adds a component to the project.
    -   Options: `--no-install`
-   `list`: Lists installed components.
-   `components`: Lists available components in the registry.
-   `render <composition>`: Renders a composition from the CLI.
    -   Options: `--concurrency`, `--start-frame`, `--frame-count`
-   `merge <files...>`: Merges video files.

## Section D: UI Components

-   **StudioLayout**: Main layout with resizable Sidebar, Inspector, and Timeline panels.
-   **Sidebar**: Navigation tabs (Compositions, Assets, Components, Captions, Audio, Renders).
-   **Stage**: Main preview area containing `<helios-player>`.
-   **Timeline**: Track-based timeline for scrubbing, editing, and adjusting time-based prop markers (Stacked Audio Tracks).
-   **PropsEditor**: Form for editing composition input props (`HeliosSchema`) with auto-save persistence.
-   **RendersPanel**: Configures and manages render jobs.
    -   **RenderConfig**: Settings for Mode, Bitrate, Codec, Concurrency (with Presets).
-   **AssetsPanel**: Drag-and-drop asset management.
-   **AudioPanel**: Audio track mixer with Volume, Mute, Solo controls, and Master Audio Meter.
-   **Omnibar**: Command palette (Cmd+K).

## Section E: Integration

-   **StudioContext**: Central store for Studio state (compositions, assets, render jobs, player state). Syncs loop and playback range to `HeliosController`. Provides `openInEditor(path)` to open files in default editor.
-   **HeliosPlayer**: The web component used for playback. Studio controls it via `HeliosController`.
-   **Backend API**:
    -   `GET /api/compositions`: List available compositions.
    -   `POST /api/render`: Submit a render job.
    -   `GET /api/jobs`: List render jobs.
    -   `GET /api/assets`: List assets.
    -   `GET /api/documentation`: Returns documentation sections (READMEs and SKILLs).
