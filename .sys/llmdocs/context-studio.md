# Studio Context

## Section A: Architecture
Helios Studio is a web-based UI for previewing and modifying Helios projects.
It consists of:
- A CLI runner (`packages/studio/bin/studio.js` and `packages/cli`).
- A Vite-based development server using plugins to expose the filesystem and studio API.
- A React-based frontend application displaying a Timeline, Properties Editor, Stage, and Assets Panel.
- It acts as the host environment embedding `<helios-player>`.

## Section B: File Tree
```
packages/studio/
├── bin/
│   └── studio.js
├── scripts/
│   └── (build/verification scripts)
├── src/
│   ├── api/
│   ├── components/
│   │   ├── Stage/
│   │   ├── Timeline/
│   │   ├── PropsEditor/
│   │   ├── AssetsPanel/
│   │   └── ...
│   ├── contexts/
│   ├── hooks/
│   ├── types/
│   └── App.tsx
├── package.json
└── vite.config.ts
```

## Section C: CLI Interface
- `npx helios init <project>`: Scaffolds a new project with chosen framework.
- `npx helios studio` (or `npm run dev` in initialized projects): Starts the Studio UI on localhost.
- `npx helios preview`: Serves a production build for verification.
- `npx helios diff <component>`: Compares a component to the registry.
- `npx helios components`: Lists available components.
- `npx helios add <component>`: Installs a component from the registry.

## Section D: UI Components
- **Stage**: Renders the `<helios-player>` with zoom, pan, and safe-area guides.
- **Timeline**: Visual scrubber for playback, loop ranges, and markers.
- **Props Editor**: Dynamically generated schema-aware inputs.
- **Assets Panel**: File explorer for images, video, audio, fonts, and other assets (supports drag-and-drop organization).
- **Renders Panel**: Manages distributed render jobs and client-side exports.
- **Components Panel**: Browse and install registry components.
- **Diagnostics Panel**: Views system capabilities.

## Section E: Integration
- Integrates with `packages/core` via `HeliosState` and `HeliosController`.
- Integrates with `packages/player` by embedding `<helios-player>`.
- Integrates with `packages/renderer` via `/api/render` to execute rendering tasks.
- Integrates with filesystem operations via `discovery.ts` (e.g., `moveAsset`, `deleteAsset`, `renameAsset`) to manage workspace files.
