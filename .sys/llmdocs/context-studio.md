# STUDIO Domain Context

## A. Architecture
Helios Studio is a browser-based development environment for creating video compositions.
- **Frontend**: A React application (SPA) served by Vite. It provides the UI for editing props, timeline scrubbing, and managing assets.
- **Backend**: A custom Vite plugin (`studioPlugin.ts`) running on the development server. It handles file system operations (finding compositions/assets), serving user projects, and dispatching render jobs.
- **Preview**: Uses the `<helios-player>` Web Component (from `packages/player`) to render the composition in an isolated iframe (or direct DOM).
- **HMR**: Leverages Vite's HMR for instant feedback. The `Stage` component includes logic to preserve playback state (frame, playing) across HMR reloads.

## B. File Tree
```
packages/studio/
├── src/
│   ├── components/       # UI Components
│   │   ├── Assets/       # Asset Browser
│   │   ├── Stage/        # Main Preview Area (Player + Controls)
│   │   ├── Timeline/     # Playback & Scrubbing
│   │   ├── PropsEditor/  # Input Properties Form
│   │   ├── Renders/      # Render Job Management
│   │   └── ...
│   ├── context/          # Global State (StudioContext)
│   ├── hooks/            # Custom Hooks
│   ├── server/           # Backend Logic (Vite Plugins)
│   ├── App.tsx           # Main Layout
│   └── main.tsx          # Entry Point
├── package.json
└── vite.config.ts
```

## C. CLI Interface
Run via `npx helios studio` (or `npm run dev` in `packages/studio` for development).

```bash
npx helios studio [dir]
```
- `[dir]`: Optional path to the project root. Defaults to current working directory (`process.cwd()`). This directory is where Studio looks for compositions and assets.

## D. UI Components
- **Stage**: The central canvas area hosting `<helios-player>`. Supports pan/zoom, transparency toggle, and resolution controls. Handles HMR state preservation.
- **Timeline**: Bottom panel for time navigation. Includes play/pause, loop, seek bar, and range markers (In/Out points).
- **Props Editor**: Right panel for editing `inputProps`. Auto-generates form fields based on prop types (supports JSON editing for complex types).
- **Assets Panel**: Left panel tab for browsing discovered assets (images, videos) in the project.
- **Renders Panel**: Left panel tab for managing render jobs. Shows status and progress of active renders.
- **Composition Switcher**: Command palette (Cmd+K) to switch between different compositions found in the project.

## E. Integration
- **Core**: Studio imports types (`HeliosController`) from `@helios-project/core`.
- **Player**: Studio consumes the `@helios-project/player` package to render the preview. It communicates via the `HeliosController` API (seek, play, pause).
- **Renderer**: Studio integrates with `@helios-project/renderer` via the backend server. The `/api/render` endpoint triggers actual rendering processes (using `WebCodecs` or `Puppeteer`) and reports progress back to the UI.
