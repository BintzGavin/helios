# STUDIO DOMAIN CONTEXT

## Section A: Architecture
Studio is a framework-agnostic development environment for video composition.
- **CLI**: Entry point via `npx helios studio` starting the dev server and CLI tools.
- **Server**: Dev server built using Vite plugins to serve, discover, and build compositions.
- **UI Structure**: Uses a React-based interface with key panels like Timeline, Stage, AssetsPanel, and PropsEditor.

## Section B: File Tree
```text
packages/studio/src
├── App.tsx
├── components
│   ├── AssetsPanel
│   │   ├── AssetItem.tsx
│   │   ├── AssetsPanel.tsx
│   │   └── FolderItem.tsx
│   ├── AssistantModal
│   │   ├── AssistantModal.tsx
│   │   └── index.ts
│   ├── AudioMixerPanel
│   │   ├── AudioMeter.tsx
│   │   └── AudioMixerPanel.tsx
│   ├── CaptionsPanel
│   │   └── CaptionsPanel.tsx
│   ├── ComponentsPanel
│   │   └── ComponentsPanel.tsx
│   ├── CompositionSettingsModal.tsx
│   ├── CompositionsPanel
│   │   ├── CompositionItem.tsx
│   │   ├── CompositionTree.tsx
│   │   └── CompositionsPanel.tsx
│   ├── ConfirmationModal
│   │   └── ConfirmationModal.tsx
│   ├── Controls
│   │   ├── PlaybackControls.tsx
│   │   ├── TimecodeDisplay.tsx
│   │   └── TimecodeInput.tsx
│   ├── CreateCompositionModal.tsx
│   ├── DiagnosticsModal.tsx
│   ├── DuplicateCompositionModal.tsx
│   ├── GlobalShortcuts.tsx
│   ├── KeyboardShortcutsModal.tsx
│   ├── Layout
│   │   ├── Panel.tsx
│   │   ├── Resizer.tsx
│   │   └── StudioLayout.tsx
│   ├── Omnibar.tsx
│   ├── PropsEditor.tsx
│   ├── RenderPreviewModal.tsx
│   ├── RendersPanel
│   │   ├── RenderConfig.tsx
│   │   └── RendersPanel.tsx
│   ├── SchemaInputs.tsx
│   ├── Sidebar
│   │   └── Sidebar.tsx
│   ├── Stage
│   │   ├── EmptyState.tsx
│   │   ├── Stage.tsx
│   │   └── StageToolbar.tsx
│   ├── Timeline.tsx
│   ├── TimelineAudioTrack.tsx
│   └── Toast
│       ├── Toast.tsx
│       └── ToastContainer.tsx
├── context
│   ├── StudioContext.tsx
│   └── ToastContext.tsx
├── data
│   └── ai-context.ts
├── hooks
│   ├── useAudioWaveform.test.ts
│   ├── useAudioWaveform.ts
│   ├── useKeyboardShortcut.test.ts
│   ├── useKeyboardShortcut.ts
│   ├── usePersistentState.test.ts
│   └── usePersistentState.ts
├── main.tsx
├── server
│   ├── discovery.test.ts
│   ├── discovery.ts
│   ├── documentation.test.ts
│   ├── documentation.ts
│   ├── mcp.test.ts
│   ├── mcp.ts
│   ├── plugin.ts
│   ├── render-manager.test.ts
│   ├── render-manager.ts
│   ├── templates
│   │   ├── index.test.ts
│   │   ├── index.ts
│   │   ├── react.test.ts
│   │   ├── react.ts
│   │   ├── solid.test.ts
│   │   ├── solid.ts
│   │   ├── svelte.test.ts
│   │   ├── svelte.ts
│   │   ├── threejs.test.ts
│   │   ├── threejs.ts
│   │   ├── types.ts
│   │   ├── vanilla.test.ts
│   │   ├── vanilla.ts
│   │   ├── vue.test.ts
│   │   └── vue.ts
│   └── types.ts
├── setupTests.ts
├── types.ts
├── utils
│   ├── srt.test.ts
│   ├── srt.ts
│   ├── tree.test.ts
│   └── tree.ts
└── vite-env.d.ts

21 directories, 82 files

```

## Section C: CLI Interface
`npx helios studio`
Options typically include setting the port, host, and specifying project root (via `HELIOS_PROJECT_ROOT`).

## Section D: UI Components
- **Timeline**: Visualizes composition duration, current time, markers, and scrubber.
- **Stage**: Canvas to preview the video player with Zoom, Pan, Transparency, and Guides controls.
- **AssetsPanel**: Manages and previews assets (video, audio, fonts) with drag & drop functionality.
- **PropsEditor**: Dynamically editable properties of the current composition based on the Helios schema.

## Section E: Integration
- **Core**: Interfaces with `@helios-project/core` for the controller (`HeliosController`) and state tracking.
- **Player**: Utilizes `@helios-project/player` for the `<helios-player>` Web Component.
- **Renderer**: Communicates with `@helios-project/renderer` via Vite APIs for real job execution.
