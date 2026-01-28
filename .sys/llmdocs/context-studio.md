# STUDIO Domain Context

## A. Architecture
The Studio is a Vite-based single-page application (SPA) that serves as the development environment for Helios compositions. It allows users to:
1. Preview compositions with real-time feedback.
2. Edit props, captions, and timeline markers.
3. Manage assets, render jobs, and client-side exports.
4. Diagnose environment capabilities.

It consists of:
- **CLI**: Starts the Studio server (`npx helios studio`).
- **Server**: A Vite development server with a custom plugin (`vite-plugin-studio-api.ts`) that provides backend APIs for file discovery, rendering, and diagnostics.
- **UI**: A React application that consumes the backend APIs and integrates the `<helios-player>` component.

## B. File Tree
```
packages/studio/
├── scripts/
├── src/
│   ├── components/
│   │   ├── AssetsPanel/
│   │   ├── CaptionsPanel/
│   │   ├── Controls/
│   │   ├── Layout/
│   │   ├── RendersPanel/
│   │   ├── Sidebar/
│   │   ├── Stage/
│   │   ├── CompositionSwitcher.tsx
│   │   ├── DiagnosticsModal.tsx
│   │   ├── KeyboardShortcutsModal.tsx
│   │   ├── SystemPromptModal.tsx
│   │   ├── PropsEditor.tsx
│   │   ├── SchemaInputs.tsx
│   │   └── Timeline.tsx
│   ├── context/
│   │   └── StudioContext.tsx
│   ├── hooks/
│   │   └── useKeyboardShortcut.ts
│   ├── server/
│   │   ├── discovery.ts
│   │   └── render-manager.ts
│   ├── App.tsx
│   └── main.tsx
├── vite-plugin-studio-api.ts
├── vite.config.ts
└── vitest.config.ts
```

## C. CLI Interface
Run via `npx helios studio` (or `npm run dev` in `packages/studio` during development).
- **Options**:
  - `--port`: Specify the port (default: 5173).
  - `--open`: Open the browser automatically.

## D. UI Components
- **Sidebar**: Navigation tabs (Assets, Captions, Renders) and tools (Diagnostics, Help).
- **RendersPanel**: Manages server-side render jobs and initiates client-side exports (WebCodecs).
- **Stage**: The main preview area containing the `<helios-player>`. Supports pan/zoom.
- **Timeline**: Visual timeline for scrubbing, playback control, marker visualization, and zooming.
- **PropsEditor**: Schema-aware editor for composition input props.
- **DiagnosticsModal**: Displays system capabilities for Client (Preview) and Server (Renderer).
- **SystemPromptModal**: Generates optimized LLM system prompts for the current composition.
- **CompositionSwitcher**: Command palette (Cmd+K) to switch between compositions.

## E. Integration
- **Core**: Uses `Helios` class for state management and `HeliosSchema` for prop validation.
- **Player**: Embeds `@helios-project/player` web component for playback.
- **Renderer**: Calls `@helios-project/renderer` via the backend API (`/api/render`, `/api/diagnose`) to execute FFmpeg renders and check server-side capabilities.
