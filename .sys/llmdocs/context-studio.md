# Studio Context

## Section A: Architecture
Studio is a framework-agnostic browser-based development environment for video composition.
It consists of a CLI, a dev server built on top of Vite, and a browser-based UI.
The architecture uses a unified state model via `HeliosState` and interacts with a local API backend for file system operations.

## Section B: File Tree
```
packages/studio/
├── bin/
│   └── helios-studio.js
├── dist/                # Build artifacts
├── src/
│   ├── cli/             # CLI commands (init, render, build, preview)
│   ├── components/      # UI components (PropsEditor, Timeline, Stage)
│   ├── context/         # React Context for global state
│   ├── hooks/           # Custom React hooks
│   ├── server/          # Vite plugin API backend (discovery, rendering, mcp)
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main application component
│   └── index.tsx        # React DOM entry point
└── tsconfig.json        # TypeScript configuration
```

## Section C: CLI Interface
The `npx helios studio` command launches the dev server, which uses `vite-plugin-studio-api` to serve the UI and backend API.

## Section D: UI Components
- **Stage**: The main preview area integrating `<helios-player>`.
- **Timeline**: Allows scrubbing, setting in/out points, and visualizes audio waveforms.
- **Props Editor**: A schema-aware UI for modifying input properties interactively, including visual schema validation.
- **Assets Panel**: For managing local media files with drag-and-drop.
- **Renders Panel**: For configuring and launching server-side or distributed render jobs.
- **Compositions Panel**: For switching between multiple compositions.

## Section E: Integration
- Integrates with `@helios-project/core` for state management and schemas.
- Integrates with `@helios-project/player` for rendering the preview frame.
- Integrates with `@helios-project/renderer` for launching backend render processes.
