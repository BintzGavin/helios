# STUDIO Domain Context

## A. Architecture

Helios Studio is a browser-based development environment for creating video compositions. It is built as a framework-agnostic tool that runs locally, serving the user's project files and providing a visual interface for editing and previewing.

- **CLI**: The entry point (`packages/studio/bin/helios-studio.js`) launches a Vite dev server.
- **Dev Server**: A customized Vite server (`packages/studio/src/server/`) that serves the Studio UI and provides API endpoints for filesystem operations (creating compositions, uploading assets, managing render jobs).
- **UI**: A React-based Single Page Application (SPA) that acts as the frontend. It communicates with the backend via REST API and connects to the `<helios-player>` component for preview.
- **State Management**: `StudioContext` manages global state (compositions, assets, player controller, timeline).

## B. File Tree

```
packages/studio/
├── bin/
│   └── helios-studio.js      # CLI entry point
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
│   ├── App.tsx               # Main UI layout
│   └── main.tsx              # Entry point
├── index.html                # HTML entry
├── package.json
├── vite.config.ts            # Studio build config
└── vitest.config.ts          # Test config
```

## C. CLI Interface

The Studio is launched via the `helios` CLI (from `@helios-project/cli` which calls `@helios-project/studio`).

```bash
npx helios studio [options]
```

- **Function**: Starts the Studio development server and opens the browser.
- **Project Root**: Uses the current working directory as the project root to discover `examples/` or compositions.

## D. UI Components

- **Stage**: The central preview area containing the `<helios-player>`. Supports pan, zoom, and transparency toggles.
- **Timeline**: A multi-track timeline for scrubbing, playback control, loop range setting, and audio visualization.
- **Props Editor**: A schema-aware inspector for editing composition properties (`inputProps`). Supports primitives, arrays, objects, colors, and assets.
- **Assets Panel**: A file browser for managing project assets (images, video, audio, fonts). Supports drag-and-drop to Props Editor.
- **Audio Mixer Panel**: Controls volume, mute, and solo states for individual audio tracks.
- **Compositions Panel**: Manages composition files (create, duplicate, delete).
- **Renders Panel**: Manages server-side render jobs and client-side exports.
- **Omnibar**: A command palette (Cmd+K) for quick navigation and actions.

## E. Integration

- **Core**: Consumes `HeliosSchema` for generating the Props Editor UI.
- **Player**: Embeds `<helios-player>` (via `@helios-project/player`) to render the composition and provide playback control (`HeliosController`).
- **Renderer**: Communicates with `@helios-project/renderer` (via backend API) to dispatch render jobs for high-quality output.
