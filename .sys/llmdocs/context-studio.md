# STUDIO DOMAIN CONTEXT

## Section A: Architecture
Helios Studio is a browser-based development environment for video composition. It consists of:
- **CLI Entry**: `npx helios studio` command for starting the dev server.
- **Dev Server**: A Vite-based server providing hot-reloading and serving local files.
- **UI Structure**: A React-based UI allowing users to preview, edit props, manage assets, and trigger renders.

## Section B: File Tree
packages/studio/
├── src/
│   ├── components/       # Reusable UI components
│   ├── context/          # React Context providers (StudioContext, ToastContext)
│   ├── hooks/            # Custom React hooks
│   ├── server/           # Vite plugin, APIs, and Render Management
│   ├── ui/               # Layout and view level components
│   └── utils/            # Utility functions
├── vite.config.ts        # Vite configuration
└── vitest.config.ts      # Vitest configuration

## Section C: CLI Interface
- `npx helios studio`: Starts the Studio environment on a local port.

## Section D: UI Components
- **Timeline**: Visual representation of the composition timeline.
- **Props Editor**: Dynamic editor for composition properties.
- **Assets Panel**: File management UI for composition assets.
- **Components Panel**: Registry UI for managing standard Helios components.
- **Stage**: The main preview area integrating `<helios-player>`.

## Section E: Integration
- **Core**: Studio wraps `Helios` instances to introspect and manage state.
- **Player**: Utilizes `<helios-player>` for high-performance preview and playback.
- **Renderer**: Communicates with `packages/renderer` via an API to dispatch render jobs and report progress.
