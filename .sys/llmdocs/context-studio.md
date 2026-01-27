# STUDIO Domain Context

## A. Architecture
Helios Studio is a browser-based development environment for video composition. It allows users to visualize, edit props, manage assets, and render compositions.
- **Frontend**: React-based UI (Vite).
- **Backend**: Vite Development Server with custom plugins (`vite-plugin-studio-api.ts`) for file system access (assets, compositions, renders).
- **Communication**: Frontend talks to Backend via HTTP APIs (`/api/*`).
- **Testing**: Unit tests via Vitest + React Testing Library.

## B. File Tree
```
packages/studio/
├── scripts/
├── src/
│   ├── components/         # UI Components (Timeline, PropsEditor, etc.)
│   ├── context/            # Global State (StudioContext)
│   ├── hooks/              # Custom Hooks
│   ├── server/             # Backend logic (if any specific)
│   ├── App.tsx             # Main Application Component
│   ├── main.tsx            # Entry Point
│   └── setupTests.ts       # Test setup
├── index.html
├── package.json
├── tsconfig.json
├── vite-plugin-studio-api.ts # Backend API implementation
├── vite.config.ts            # Vite Configuration
└── vitest.config.ts          # Vitest Configuration
```

## C. CLI Interface
The studio is launched via the `@helios-project/cli` package.
- Command: `npx helios studio`
- Behavior: Starts the Vite dev server and opens the browser.

## D. UI Components
- **App**: Layout container.
- **Timeline**: Visual timeline with scrubbing and range markers.
- **PlaybackControls**: Includes Play/Pause, Frame Step, Loop, Audio (Volume/Mute), and Speed controls.
- **PropsEditor**: JSON/Form editor for composition props.
- **AssetsPanel**: Drag-and-drop asset management with rich previews for Video, Audio, and Fonts.
- **RendersPanel**: Render job management (start, cancel, download).
- **Stage**: Canvas/DOM preview area.

## E. Integration
- **Core**: Consumes `Helios` class for state management.
- **Player**: Uses `<helios-player>` for preview.
- **Renderer**: Triggers render jobs via `/api/render`.
