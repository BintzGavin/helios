# Studio Domain Context

## A. Architecture
Helios Studio is a web-based integrated development environment (IDE) for programmatic video creation.

-   **Frontend**: A React application (SPA) that provides the visual interface.
-   **Backend**: A Vite Middleware (`vite-plugin-studio-api.ts`) that runs alongside the Vite Dev Server. It handles file system operations (discovery, creation, deletion) and render job management.
-   **Communication**: The frontend communicates with the backend via REST APIs (`/api/compositions`, `/api/assets`, `/api/render`).
-   **Preview**: Uses `<helios-player>` to render the composition in real-time.

## B. File Tree
packages/studio/
├── bin/                    # CLI entry point
├── src/
│   ├── components/         # UI Components (Timeline, PropsEditor, etc.)
│   ├── context/            # React Context (StudioContext)
│   ├── server/             # Backend logic (Discovery, Templates, Render Manager)
│   │   ├── templates/      # Composition templates (Vanilla, React)
│   │   ├── discovery.ts    # File system discovery
│   │   └── render-manager.ts # Render job orchestration
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Entry point
└── vite-plugin-studio-api.ts # Vite plugin for backend API

## C. CLI Interface
Run the studio using the CLI command:

```bash
npx helios studio [options]
```

-   **Command**: `studio`
-   **Description**: Starts the Studio development server.
-   **Environment**: Uses `HELIOS_PROJECT_ROOT` (or CWD) to locate compositions.

## D. UI Components
-   **Stage**: Displays the `<helios-player>` with the active composition.
-   **Timeline**: Visualizes time, playback head, markers, and in/out points.
-   **Props Editor**: Auto-generated inputs based on `HeliosSchema` (numbers, colors, enums, files).
-   **Assets Panel**: Manages project assets (images, video, audio, etc.).
-   **Compositions Switcher**: Dropdown/Modal to switch between compositions.
-   **Render Panel**: Manages render jobs and downloads.
-   **Create Modal**: Creates new compositions using templates (Vanilla JS, React).

## E. Integration
-   **Core**: Consumes `HeliosSchema` and `Helios` types.
-   **Player**: Embeds `<helios-player>` for preview and interacts via `HeliosController`.
-   **Renderer**: Triggers renders via the backend, which spawns renderer processes.
