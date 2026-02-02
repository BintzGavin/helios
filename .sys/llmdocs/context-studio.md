# Studio Context

## A. Architecture
Helios Studio is a browser-based development environment for video composition.
- **Frontend**: React-based UI (Vite) located in `packages/studio/src`.
- **Backend**: Vite plugins serve as the backend API (`vite-plugin-studio-api`) for file system operations (assets, compositions, renders).
- **State Management**: `StudioContext` manages global state (active composition, player state, panels).
- **Communication**: Interacts with `helios-player` via `HeliosController`.

## B. File Tree
packages/studio/
├── bin/            # CLI entry point
├── src/
│   ├── components/ # UI Components (Timeline, PropsEditor, Stage, etc.)
│   ├── context/    # Context Providers (StudioContext, ToastContext)
│   ├── hooks/      # Custom hooks
│   ├── ui/         # Generic UI elements
│   ├── App.tsx     # Main application component
│   └── main.tsx    # Entry point
├── vite.config.ts  # Vite configuration (plugins)
└── package.json

## C. CLI Interface
- `npx helios studio`: Starts the Studio development server.
  - Options: None currently standardized in args, but uses `HELIOS_PROJECT_ROOT` env var.

## D. UI Components
- **Stage**: Renders the `<helios-player>` or empty state.
- **Timeline**: Visual timeline for playback control and markers.
- **PropsEditor**: JSON-schema driven form for editing composition props.
- **Sidebar**: Navigation (Assets, Renders, Settings).
- **Omnibar**: Command palette (Cmd+K) for navigation and actions.
- **AssetsPanel**: Manages project assets (upload, delete, rename).
- **RendersPanel**: Manages render jobs.
- **Toast**: Notification system for user feedback.

## E. Integration
- **Core**: Consumes `HeliosSchema` for props editing.
- **Player**: Controls `HeliosController` for playback and seeking.
- **Renderer**: Dispatches render jobs via API endpoints (`/api/render`).
