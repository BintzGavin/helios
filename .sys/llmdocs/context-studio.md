# Studio Domain Context

## A. Architecture
The Helios Studio (`packages/studio`) is a React-based Single Page Application (SPA) served by Vite. It provides a visual development environment for video compositions.

- **Frontend**: React + Vite. Uses `StudioContext` for global state management.
- **Backend**: Vite Plugin (`vite-plugin-studio-api.ts`) provides API endpoints (`/api/*`) for file system access (discovery, rendering).
- **Preview**: Uses `<helios-player>` web component to render the composition.
- **Rendering**: Delegates to `@helios-project/renderer` via the backend API.

## B. File Tree
```text
packages/studio/
├── src/
│   ├── components/
│   │   ├── AssetsPanel/
│   │   ├── Controls/
│   │   ├── Layout/
│   │   ├── PropsEditor/
│   │   ├── RendersPanel/
│   │   │   ├── RenderConfig.tsx
│   │   │   ├── RendersPanel.tsx
│   │   │   └── RendersPanel.css
│   │   ├── Sidebar/
│   │   ├── Stage/
│   │   └── Timeline/
│   ├── context/
│   │   └── StudioContext.tsx
│   ├── hooks/
│   ├── server/
│   │   ├── discovery.ts
│   │   └── render-manager.ts
│   ├── App.tsx
│   └── main.tsx
├── vite-plugin-studio-api.ts
└── vite.config.ts
```

## C. CLI Interface
The Studio is launched via the `@helios-project/cli` command:
`npx helios studio`

- **Environment**: Sets `HELIOS_PROJECT_ROOT` to the user's current working directory (or specific path).
- **Port**: Default 5173.

## D. UI Components
- **Sidebar**: Tabs for "Assets" and "Renders".
- **Assets Panel**: Lists project assets.
- **Renders Panel**: Controls for rendering (Mode, Bitrate, Codec) and job list.
- **Stage**: Displays the `<helios-player>` preview.
- **Timeline**: Playback controls and scrubber.
- **Props Editor**: JSON and primitive editors for `inputProps`.

## E. Integration
- **Core**: Consumes `Composition` definitions.
- **Player**: Controls `<helios-player>` via `HeliosController`.
- **Renderer**: Dispatches render jobs via `Renderer` class in `packages/renderer`.
