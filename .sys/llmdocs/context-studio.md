# STUDIO DOMAIN CONTEXT

## Section A: Architecture
Studio is a framework-agnostic development environment for video composition.
- **CLI**: Entry point via `npx helios studio` starting the dev server and CLI tools.
- **Server**: Dev server built using Vite plugins to serve, discover, and build compositions.
- **UI Structure**: Uses a React-based interface with key panels like Timeline, Stage, AssetsPanel, and PropsEditor.

## Section B: File Tree
```text
packages/studio/src
./
├── App.tsx
├── components/
│   ├── AssetsPanel/
│   │   ├── AssetItem.css
│   │   ├── AssetItem.test.tsx
│   │   ├── AssetItem.tsx
│   │   ├── AssetsPanel.css
│   │   ├── AssetsPanel.test.tsx
│   │   ├── AssetsPanel.tsx
│   │   ├── FolderItem.css
│   │   └── FolderItem.tsx
│   ├── AssistantModal/
│   │   ├── AssistantModal.css
│   │   ├── AssistantModal.test.tsx
│   │   ├── AssistantModal.tsx
│   │   └── index.ts
│   ├── AudioMixerPanel/
│   │   ├── AudioMeter.test.tsx
│   │   ├── AudioMeter.tsx
│   │   ├── AudioMixerPanel.css
│   │   ├── AudioMixerPanel.test.tsx
│   │   └── AudioMixerPanel.tsx
│   ├── CaptionsPanel/
│   │   ├── CaptionsPanel.css
│   │   ├── CaptionsPanel.test.tsx
│   │   └── CaptionsPanel.tsx
│   ├── ComponentsPanel/
│   │   ├── ComponentsPanel.css
│   │   ├── ComponentsPanel.test.tsx
│   │   └── ComponentsPanel.tsx
│   ├── CompositionSettingsModal.css
│   ├── CompositionSettingsModal.tsx
│   ├── CompositionsPanel/
│   │   ├── CompositionItem.test.tsx
│   │   ├── CompositionItem.tsx
│   │   ├── CompositionTree.css
│   │   ├── CompositionTree.tsx
│   │   ├── CompositionsPanel.css
│   │   ├── CompositionsPanel.test.tsx
│   │   └── CompositionsPanel.tsx
│   ├── ConfirmationModal/
│   │   ├── ConfirmationModal.css
│   │   └── ConfirmationModal.tsx
│   ├── Controls/
│   │   ├── PlaybackControls.test.tsx
│   │   ├── PlaybackControls.tsx
│   │   ├── TimecodeDisplay.css
│   │   ├── TimecodeDisplay.test.tsx
│   │   ├── TimecodeDisplay.tsx
│   │   ├── TimecodeInput.css
│   │   ├── TimecodeInput.test.tsx
│   │   └── TimecodeInput.tsx
│   ├── CreateCompositionModal.css
│   ├── CreateCompositionModal.tsx
│   ├── DiagnosticsModal.css
│   ├── DiagnosticsModal.test.tsx
│   ├── DiagnosticsModal.tsx
│   ├── DuplicateCompositionModal.css
│   ├── DuplicateCompositionModal.tsx
│   ├── GlobalShortcuts.test.tsx
│   ├── GlobalShortcuts.tsx
│   ├── KeyboardShortcutsModal.css
│   ├── KeyboardShortcutsModal.test.tsx
│   ├── KeyboardShortcutsModal.tsx
│   ├── Layout/
│   │   ├── Panel.tsx
│   │   ├── Resizer.css
│   │   ├── Resizer.tsx
│   │   ├── StudioLayout.css
│   │   └── StudioLayout.tsx
│   ├── Omnibar.css
│   ├── Omnibar.test.tsx
│   ├── Omnibar.tsx
│   ├── PropsEditor.css
│   ├── PropsEditor.test.tsx
│   ├── PropsEditor.tsx
│   ├── RenderPreviewModal.css
│   ├── RenderPreviewModal.tsx
│   ├── RendersPanel/
│   │   ├── RenderConfig.test.tsx
│   │   ├── RenderConfig.tsx
│   │   ├── RendersPanel.css
│   │   ├── RendersPanel.test.tsx
│   │   └── RendersPanel.tsx
│   ├── SchemaInputs.test.tsx
│   ├── SchemaInputs.tsx
│   ├── Sidebar/
│   │   ├── Sidebar.css
│   │   └── Sidebar.tsx
│   ├── Stage/
│   │   ├── EmptyState.css
│   │   ├── EmptyState.tsx
│   │   ├── Stage.css
│   │   ├── Stage.test.tsx
│   │   ├── Stage.tsx
│   │   └── StageToolbar.tsx
│   ├── Timeline.css
│   ├── Timeline.test.tsx
│   ├── Timeline.tsx
│   ├── TimelineAudioTrack.test.tsx
│   ├── TimelineAudioTrack.tsx
│   └── Toast/
│       ├── Toast.css
│       ├── Toast.test.tsx
│       ├── Toast.tsx
│       ├── ToastContainer.test.tsx
│       └── ToastContainer.tsx
├── context/
│   ├── StudioContext.test.tsx
│   ├── StudioContext.tsx
│   ├── ToastContext.test.tsx
│   └── ToastContext.tsx
├── data/
│   └── ai-context.ts
├── hooks/
│   ├── useAudioWaveform.test.ts
│   ├── useAudioWaveform.ts
│   ├── useKeyboardShortcut.ts
│   └── usePersistentState.ts
├── main.tsx
├── server/
│   ├── discovery.test.ts
│   ├── discovery.ts
│   ├── documentation.test.ts
│   ├── documentation.ts
│   ├── mcp.test.ts
│   ├── mcp.ts
│   ├── plugin.ts
│   ├── render-manager.test.ts
│   ├── render-manager.ts
│   ├── templates/
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
├── utils/
│   ├── srt.test.ts
│   ├── srt.ts
│   ├── tree.test.ts
│   └── tree.ts
└── vite-env.d.ts

21 directories, 135 files

```

## Section C: CLI Interface
- `npx helios studio`: Starts the Studio development server and opens the UI.
- `npx helios studio --port <port>`: Starts the server on a specific port.

## Section D: UI Components
- **Timeline**: Manages composition timeline, playback scrubbing, and range markers.
- **PropsEditor**: Schema-aware property editor for components (e.g. Range, Enum, Color, Arrays).
- **AssetsPanel**: Manages project assets including video, audio, images, fonts, 3D models, and JSON data.
- **Stage**: Renders the `<helios-player>` with pan, zoom, and snapshot controls.
- **RendersPanel**: Manages render jobs via the Renderer integration.
- **AudioMixerPanel**: Manages individual audio track volumes with an AudioMeter for visual levels.

## Section E: Integration
- **Core**: Consumes `Helios` for schema, state management, and caption sync.
- **Player**: Utilizes `<helios-player>` for live previews.
- **Renderer**: Communicates with `/api/render` endpoint for dispatching and canceling real render jobs.
