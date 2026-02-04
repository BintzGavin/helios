# STUDIO Domain Context

## A. Architecture

Helios Studio is a browser-based development environment for creating video compositions. It is built as a framework-agnostic tool that runs locally, serving the user's project files and providing a visual interface for editing and previewing.

- **CLI**: The entry point (`packages/cli/bin/helios.js`) provides commands to initialize projects (`init`), add components (`add`), render videos (`render`), and launch the Studio (`studio`).
- **Dev Server**: The `studio` command launches a Vite server (as a library) configured with `studioApiPlugin` (`packages/studio/src/server/`), which serves the Studio UI (overlay) and provides API endpoints for filesystem operations and HMR.
- **UI**: A React-based Single Page Application (SPA) that acts as the frontend. It communicates with the backend via REST API and connects to the `<helios-player>` component for preview.
- **State Management**: `StudioContext` manages global state (compositions, assets, player controller, timeline).

## B. File Tree

```
packages/studio/
├── bin/
│   └── helios-studio.js      # Legacy server entry point
├── src/
│   ├── components/           # UI Components
│   │   ├── AssetsPanel/
│   │   ├── AudioMixerPanel/
│   │   ├── CaptionsPanel/
│   │   ├── CompositionsPanel/
│   │   ├── Controls/
│   │   ├── PropsEditor/
│   │   ├── RendersPanel/
│   │   ├── Stage/
│   │   ├── Timeline/
│   │   └── ...
│   ├── context/
│   │   └── StudioContext.tsx # Global state
│   ├── server/               # Backend logic (Vite plugins)
│   │   ├── plugin.ts         # Main studioApiPlugin export
│   │   ├── render-manager.ts # Render orchestration
│   │   └── ...
│   ├── App.tsx               # Main UI layout
│   └── main.tsx              # Entry point
├── index.html                # HTML entry
├── package.json
├── vite.config.ts            # Studio UI build config
├── vite.config.cli.ts        # CLI plugin build config
├── tsconfig.cli.json         # CLI types build config
└── vitest.config.ts          # Test config
```

## C. CLI Interface

The Helios CLI (`@helios-project/cli`) provides commands for project management and Studio access.

```bash
npx helios <command> [options]
```

### Commands

- **`studio`**: Starts the Studio development server and opens the browser.
  - Usage: `npx helios studio [options]`
  - Options: `-p, --port <number>` (default: 5173)
  - Uses current working directory to discover compositions.
- **`render <input>`**: Renders a composition to video.
  - Usage: `npx helios render <input> [options]`
  - Options: `-o, --output <path>`, `--width`, `--height`, `--fps`, `--duration`, `--quality`, `--mode`.
- **`init`**: Initializes a new Helios project configuration (`helios.config.json`).
  - Scaffolds directory structure references.
- **`add <component>`**: Adds a component to the project (Shadcn-style).
  - Fetches component code from the registry (`packages/cli/src/registry/manifest.ts`).
  - Installs component files (e.g. `Timer.tsx`, `ProgressBar.tsx`) and dependencies into the configured `components` directory.

## D. UI Components

- **Stage**: The central preview area containing the `<helios-player>`. Supports pan, zoom, and transparency toggles.
- **Timeline**: A multi-track timeline for scrubbing, playback control, loop range setting, and audio visualization.
- **Props Editor**: A schema-aware inspector for editing composition properties (`inputProps`). Supports primitives, arrays, objects, colors, and assets.
- **Assets Panel**: A file browser for managing project assets (images, video, audio, fonts). Supports drag-and-drop to Props Editor.
- **Audio Mixer Panel**: Controls volume, mute, and solo states for individual audio tracks.
- **Compositions Panel**: Manages composition files (create, duplicate, delete).
- **Renders Panel**: Manages server-side render jobs (single or distributed with concurrency control) and client-side exports.
- **Omnibar**: A command palette (Cmd+K) for quick navigation and actions.

## E. Integration

- **Core**: Consumes `HeliosSchema` for generating the Props Editor UI.
- **Player**: Embeds `<helios-player>` (via `@helios-project/player`) to render the composition and provide playback control (`HeliosController`).
- **Renderer**: Communicates with `@helios-project/renderer` (via backend API using `RenderOrchestrator`) to dispatch render jobs for high-quality output.
