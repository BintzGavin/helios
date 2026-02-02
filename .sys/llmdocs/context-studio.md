# Studio Context

## A. Architecture

Studio acts as a host environment for the Helios Player.

- **Frontend**: React-based UI that wraps the `<helios-player>` component.
- **Backend**: Vite plugin (`vite-plugin-studio-api`) that provides API endpoints for file discovery, asset management, and render job orchestration.
- **Context**: `StudioContext` manages the global state (active composition, player state, assets).

## B. File Tree

```
packages/studio/
├── bin/
│   └── helios-studio.js
├── src/
│   ├── cli.ts
│   ├── components/
│   │   ├── AssetsPanel/
│   │   ├── Controls/
│   │   ├── PropsEditor/
│   │   ├── Stage/
│   │   ├── Timeline/
│   │   └── Toast/
│   ├── context/
│   │   ├── StudioContext.tsx
│   │   └── ToastContext.tsx
│   ├── server/
│   │   ├── api.ts
│   │   └── server.ts
│   └── utils/
└── vite.config.ts
```

## C. CLI Interface

`npx helios studio` starts the development environment.

- `PORT`: Configure the port (default: 5173).
- `HELIOS_PROJECT_ROOT`: Set the root directory for scanning compositions.

## D. UI Components

- **Timeline**: Visual timeline with scrubbing, playhead, and markers.
- **Props Editor**: Schema-aware input forms for composition properties.
- **Assets Panel**: Drag-and-drop asset management.
- **Renders Panel**: Render job tracking and history.
- **Toast**: Notification system for user feedback.
- **Omnibar**: Command palette for quick actions and navigation.

## E. Integration

- **Core**: Consumes `Helios` instance for state synchronization.
- **Player**: Renders the composition within `<helios-player>`.
- **Renderer**: Orchestrates rendering via `api/render` endpoints using `@helios-project/renderer`.
