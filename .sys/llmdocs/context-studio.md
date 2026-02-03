# Studio Context

## A. Architecture

Studio acts as a host environment for the Helios Player.

- **Frontend**: React-based UI that wraps the `<helios-player>` component.
- **Backend**: Vite plugin (`vite-plugin-studio-api`) that provides API endpoints for file discovery, asset management, and render job orchestration.
- **Context**: `StudioContext` manages the global state (active composition, player state including audio tracks metadata, assets) and persists timeline settings (In/Out/Loop/Frame) to localStorage.

## B. File Tree

```
packages/studio/
├── bin/
│   └── helios-studio.js
├── src/
│   ├── cli.ts
│   ├── components/
│   │   ├── AssetsPanel/
│   │   ├── AssistantModal/
│   │   ├── AudioMixerPanel/
│   │   ├── CaptionsPanel/
│   │   ├── CompositionsPanel/
│   │   ├── Controls/
│   │   ├── Layout/
│   │   ├── Stage/
│   │   ├── Toast/
│   │   ├── Timeline.tsx
│   │   ├── Timeline.css
│   │   ├── CompositionSettingsModal.tsx
│   │   ├── CreateCompositionModal.tsx
│   │   ├── DiagnosticsModal.tsx
│   │   ├── DuplicateCompositionModal.tsx
│   │   ├── GlobalShortcuts.tsx
│   │   ├── KeyboardShortcutsModal.tsx
│   │   ├── Omnibar.tsx
│   │   ├── PropsEditor.tsx
│   │   └── RenderPreviewModal.tsx
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

- **Timeline**: Visual timeline with scrubbing, playhead, markers, loop range (In/Out) control, and multi-lane stacked audio track visualization.
- **Props Editor**: Schema-aware input forms for composition properties.
- **Assets Panel**: Drag-and-drop asset management.
- **Renders Panel**: Render job tracking and history.
- **Toast**: Notification system for user feedback.
- **Omnibar**: Command palette for quick actions, navigation, and asset management (Cmd+K).
- **Assistant**: AI-powered help and documentation search.
- **Audio Mixer**: Volume and mute controls for individual audio tracks.

## E. Integration

- **Core**: Consumes `Helios` instance for state synchronization.
- **Player**: Renders the composition within `<helios-player>`.
- **Renderer**: Orchestrates rendering via `api/render` endpoints using `@helios-project/renderer`.
